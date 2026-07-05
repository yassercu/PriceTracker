const DB_NAME = 'PriceTrackerDB';
const DB_VERSION = 4;
const PRODUCT_STORE = 'products';
const LIST_STORE = 'shoppingLists';

const UNIT_PRESETS = [
    { value: 'kg', label: 'Kilogramo (kg)', defaultQty: 1 },
    { value: 'g', label: 'Gramo (g)', defaultQty: 250 },
    { value: 'L', label: 'Litro (L)', defaultQty: 1 },
    { value: 'ml', label: 'Mililitro (ml)', defaultQty: 500 },
    { value: 'unidad', label: 'Unidad', defaultQty: 1 },
    { value: 'pack', label: 'Pack / paquete', defaultQty: 1 },
    { value: 'docena', label: 'Docena', defaultQty: 12 },
    { value: 'cl', label: 'Centilitro (cl)', defaultQty: 33 }
];

let db;

function normalizeName(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeUnitLabel(label) {
    const norm = normalizeName(label);
    const aliases = {
        kilogramo: 'kg', kilogramos: 'kg', kilo: 'kg', kgs: 'kg',
        gramo: 'g', gramos: 'g', gr: 'g',
        litro: 'L', litros: 'L', l: 'L',
        mililitro: 'ml', mililitros: 'ml',
        unidades: 'unidad', ud: 'unidad', uds: 'unidad', u: 'unidad',
        paquete: 'pack', paquetes: 'pack',
        docenas: 'docena',
        kilogramme: 'kg', kilogrammes: 'kg',
        gramme: 'g', grammes: 'g',
        litre: 'L', litres: 'L',
        millilitre: 'ml', millilitres: 'ml', centilitre: 'cl', centilitres: 'cl',
        unite: 'unidad', unites: 'unidad',
        paquet: 'pack', paquets: 'pack'
    };
    return aliases[norm] || (label || '').trim();
}

function priceToNumber(p) {
    if (typeof p === 'number') return p;
    return parseFloat(String(p).replace(',', '.')) || 0;
}

function computePricePerUnit(priceNum, unitQty) {
    const qty = parseFloat(unitQty);
    if (!qty || qty <= 0) return null;
    return priceNum / qty;
}

function getComparableValue(product, sortBy = 'pricePerUnit') {
    const price = priceToNumber(product.price);
    if (sortBy === 'price') return price;
    if (sortBy === 'date') {
        return product.dateAddedISO ? new Date(product.dateAddedISO).getTime() : new Date(product.dateAdded).getTime();
    }
    return product.pricePerUnit ?? computePricePerUnit(price, product.unitQty) ?? price;
}

function enrichProduct(product) {
    const priceNum = priceToNumber(product.price);
    const now = new Date();
    const dateAddedISO = product.dateAddedISO || now.toISOString();
    return {
        ...product,
        price: priceNum,
        productNameNorm: normalizeName(product.productName),
        storeNameNorm: normalizeName(product.storeName),
        unitLabel: product.unitLabel ? normalizeUnitLabel(product.unitLabel) : '',
        pricePerUnit: computePricePerUnit(priceNum, product.unitQty),
        dateAdded: product.dateAdded || now.toLocaleDateString('es-ES'),
        dateAddedISO,
        history: Array.isArray(product.history) ? product.history : [{ date: dateAddedISO, price: priceNum }]
    };
}

function dbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error al abrir la base de datos:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(PRODUCT_STORE)) {
                const store = db.createObjectStore(PRODUCT_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('productName', 'productName', { unique: false });
                store.createIndex('productNameNorm', 'productNameNorm', { unique: false });
                store.createIndex('storeNameNorm', 'storeNameNorm', { unique: false });
                store.createIndex('dateAdded', 'dateAdded', { unique: false });
            }

            if (!db.objectStoreNames.contains(LIST_STORE)) {
                const listStore = db.createObjectStore(LIST_STORE, { keyPath: 'id', autoIncrement: true });
                listStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

async function migrateProducts() {
    const products = await getAllProductsRaw();
    for (const product of products) {
        const needsMigration = !product.productNameNorm || !product.storeNameNorm || !product.dateAddedISO;
        if (needsMigration) {
            const enriched = enrichProduct(product);
            await putProduct(enriched);
        }
    }
}

function getAllProductsRaw() {
    if (!db) return Promise.resolve([]);
    const transaction = db.transaction([PRODUCT_STORE], 'readonly');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.getAll());
}

function putProduct(product) {
    const transaction = db.transaction([PRODUCT_STORE], 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.put(product));
}

async function findProductByNameAndStore(productName, storeName, excludeId = null) {
    const products = await getAllProducts();
    const nameNorm = normalizeName(productName);
    const storeNorm = normalizeName(storeName);
    return products.find(p =>
        (p.productNameNorm || normalizeName(p.productName)) === nameNorm &&
        (p.storeNameNorm || normalizeName(p.storeName)) === storeNorm &&
        p.id !== excludeId
    ) || null;
}

async function getUniqueStores() {
    const products = await getAllProducts();
    const storeMap = new Map();
    products.forEach(p => {
        const norm = p.storeNameNorm || normalizeName(p.storeName);
        const existing = storeMap.get(norm);
        if (!existing || p.storeName.length > existing.length) {
            storeMap.set(norm, p.storeName);
        }
    });
    return [...storeMap.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

function resolveCanonicalStoreName(input, existingStores) {
    const norm = normalizeName(input);
    if (!norm) return input.trim();
    const match = existingStores.find(s => normalizeName(s) === norm);
    return match || input.trim();
}

function resolveCanonicalProductName(input, existingNames) {
    const norm = normalizeName(input);
    if (!norm) return input.trim();
    const match = existingNames.find(n => normalizeName(n) === norm);
    return match || input.trim();
}

async function createProduct(product) {
    const existingStores = await getUniqueStores();
    const canonicalStore = resolveCanonicalStoreName(product.storeName, existingStores);
    const duplicate = await findProductByNameAndStore(product.productName, canonicalStore);
    if (duplicate) {
        const err = new Error('DUPLICATE_PRODUCT');
        err.existingProduct = duplicate;
        throw err;
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const priceNum = priceToNumber(product.price);
    const enriched = enrichProduct({
        ...product,
        storeName: canonicalStore,
        price: priceNum,
        dateAdded: now.toLocaleDateString('es-ES'),
        dateAddedISO: nowISO,
        history: [{ date: nowISO, price: priceNum }]
    });

    const transaction = db.transaction([PRODUCT_STORE], 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.add(enriched));
}

function getAllProducts() {
    if (!db) return Promise.resolve([]);
    const transaction = db.transaction([PRODUCT_STORE], 'readonly');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.getAll()).then(products =>
        products.map(p => {
            if (!p.storeNameNorm || !p.productNameNorm) return enrichProduct(p);
            return p;
        })
    );
}

function getProductById(id) {
    const transaction = db.transaction([PRODUCT_STORE], 'readonly');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.get(id));
}

async function updateProduct(id, updatedProduct) {
    const product = await getProductById(id);
    if (!product) throw new Error('Producto no encontrado');

    const existingStores = await getUniqueStores();
    const canonicalStore = resolveCanonicalStoreName(updatedProduct.storeName, existingStores);
    const duplicate = await findProductByNameAndStore(
        updatedProduct.productName,
        canonicalStore,
        id
    );
    if (duplicate) {
        const err = new Error('DUPLICATE_PRODUCT');
        err.existingProduct = duplicate;
        throw err;
    }

    const priceNum = priceToNumber(updatedProduct.price);
    const ppu = computePricePerUnit(priceNum, updatedProduct.unitQty);
    const nowISO = new Date().toISOString();
    const history = Array.isArray(product.history) ? [...product.history] : [];
    if (priceToNumber(product.price) !== priceNum) {
        history.push({ date: nowISO, price: priceNum });
    }

    const enriched = enrichProduct({
        ...updatedProduct,
        storeName: canonicalStore,
        id: product.id,
        price: priceNum,
        pricePerUnit: ppu,
        dateAdded: product.dateAdded,
        dateAddedISO: product.dateAddedISO || nowISO,
        history
    });

    const transaction = db.transaction([PRODUCT_STORE], 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.put(enriched));
}

function deleteProduct(id) {
    const transaction = db.transaction([PRODUCT_STORE], 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.delete(id));
}

function searchProducts(query) {
    if (!db) return Promise.resolve([]);
    const transaction = db.transaction([PRODUCT_STORE], 'readonly');
    const store = transaction.objectStore(PRODUCT_STORE);
    return dbRequest(store.getAll()).then(products => {
        const results = products.map(p => enrichProduct(p));
        const qn = normalizeName(query);
        if (!qn) return results;
        return results.filter(p =>
            p.productNameNorm.includes(qn) ||
            p.storeNameNorm.includes(qn)
        );
    });
}

function groupProductsByName(products) {
    const grouped = {};
    products.forEach(product => {
        const key = product.productNameNorm || normalizeName(product.productName);
        if (!grouped[key]) {
            grouped[key] = { displayName: product.productName, items: [] };
        }
        grouped[key].items.push(product);
        if (product.productName.length > grouped[key].displayName.length) {
            grouped[key].displayName = product.productName;
        }
    });
    return grouped;
}

function groupAndSortProducts(products, options = {}) {
    const { sortBy = 'pricePerUnit' } = options;
    const groupedRaw = groupProductsByName(products);
    const grouped = {};
    Object.keys(groupedRaw).forEach(key => {
        const arr = [...groupedRaw[key].items];
        arr.sort((a, b) => getComparableValue(a, sortBy) - getComparableValue(b, sortBy));
        grouped[groupedRaw[key].displayName] = arr;
    });
    return grouped;
}

function getBestProductInGroup(products, sortBy = 'pricePerUnit') {
    if (!products.length) return null;
    return products.reduce((best, current) =>
        getComparableValue(current, sortBy) < getComparableValue(best, sortBy) ? current : best
    );
}

// --- Shopping List Functions ---

async function createShoppingList(name) {
    const now = new Date().toISOString();
    const list = {
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        items: []
    };
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    const id = await dbRequest(store.add(list));
    return { ...list, id };
}

async function getAllShoppingLists() {
    if (!db) return [];
    const transaction = db.transaction([LIST_STORE], 'readonly');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.getAll());
}

async function getShoppingList(id) {
    const transaction = db.transaction([LIST_STORE], 'readonly');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.get(id));
}

async function updateShoppingList(id, updates) {
    const list = await getShoppingList(id);
    if (!list) throw new Error('Lista no encontrada');
    const updated = { ...list, ...updates, updatedAt: new Date().toISOString() };
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.put(updated));
}

async function deleteShoppingList(id) {
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.delete(id));
}

async function addListItem(listId, item) {
    const list = await getShoppingList(listId);
    if (!list) throw new Error('Lista no encontrada');
    const newItem = {
        id: Date.now() + Math.random(),
        productName: item.productName.trim(),
        quantity: item.quantity || 1,
        checked: false
    };
    list.items.push(newItem);
    list.updatedAt = new Date().toISOString();
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    await dbRequest(store.put(list));
    return newItem;
}

async function updateListItem(listId, itemId, updates) {
    const list = await getShoppingList(listId);
    if (!list) throw new Error('Lista no encontrada');
    const idx = list.items.findIndex(i => i.id === itemId);
    if (idx === -1) throw new Error('Item no encontrado');
    list.items[idx] = { ...list.items[idx], ...updates };
    list.updatedAt = new Date().toISOString();
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.put(list));
}

async function removeListItem(listId, itemId) {
    const list = await getShoppingList(listId);
    if (!list) throw new Error('Lista no encontrada');
    list.items = list.items.filter(i => i.id !== itemId);
    list.updatedAt = new Date().toISOString();
    const transaction = db.transaction([LIST_STORE], 'readwrite');
    const store = transaction.objectStore(LIST_STORE);
    return dbRequest(store.put(list));
}

async function getSmartSuggestions(listId) {
    const list = await getShoppingList(listId);
    if (!list || !list.items.length) return [];

    const allProducts = await getAllProducts();
    const groupedProducts = groupProductsByName(allProducts);

    return list.items.map(item => {
        const itemNorm = normalizeName(item.productName);
        const key = Object.keys(groupedProducts).find(k =>
            normalizeName(k) === itemNorm ||
            k.includes(itemNorm) ||
            itemNorm.includes(k)
        );

        if (!key) {
            return { item, suggestions: [], best: null };
        }

        const matches = groupedProducts[key].items;
        const byStore = {};
        matches.forEach(p => {
            if (!byStore[p.storeNameNorm]) {
                byStore[p.storeNameNorm] = { store: p.storeName, options: [] };
            }
            byStore[p.storeNameNorm].options.push(p);
        });

        const suggestions = Object.values(byStore).map(s => {
            const cheapest = s.options.reduce((a, b) =>
                priceToNumber(a.price) < priceToNumber(b.price) ? a : b
            );
            return {
                store: s.store,
                price: priceToNumber(cheapest.price),
                pricePerUnit: cheapest.pricePerUnit,
                productName: cheapest.productName,
                unitQty: cheapest.unitQty,
                unitLabel: cheapest.unitLabel
            };
        }).sort((a, b) => a.price - b.price);

        const best = suggestions[0] || null;

        return { item, suggestions, best };
    });
}

async function exportData() {
    try {
        const [products, lists] = await Promise.all([getAllProducts(), getAllShoppingLists()]);
        const data = { products, lists, exportDate: new Date().toISOString() };

        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'price-tracker-backup.json');
        linkElement.click();
    } catch (error) {
        console.error('Error al exportar datos:', error);
        throw error;
    }
}

async function importData(file, options = {}) {
    const { merge = true } = options;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                const importedProducts = importedData.products || [];
                const importedLists = importedData.lists || [];
                let imported = 0, skipped = 0, updated = 0;

                for (const product of importedProducts) {
                    delete product.id;
                    const enriched = enrichProduct(product);

                    if (merge) {
                        const existing = await findProductByNameAndStore(
                            enriched.productName, enriched.storeName
                        );
                        if (existing) {
                            const existingPrice = priceToNumber(existing.price);
                            const newPrice = priceToNumber(enriched.price);
                            if (existingPrice !== newPrice) {
                                await updateProduct(existing.id, enriched);
                                updated++;
                            } else {
                                skipped++;
                            }
                            continue;
                        }
                    }

                    try {
                        await createProduct(enriched);
                        imported++;
                    } catch (err) {
                        if (err.message === 'DUPLICATE_PRODUCT') skipped++;
                        else throw err;
                    }
                }

                for (const list of importedLists) {
                    delete list.id;
                    const now = new Date().toISOString();
                    const newList = {
                        name: list.name.trim(),
                        createdAt: list.createdAt || now,
                        updatedAt: now,
                        items: (list.items || []).map(item => ({
                            id: Date.now() + Math.random(),
                            productName: item.productName.trim(),
                            quantity: item.quantity || 1,
                            checked: !!item.checked
                        }))
                    };
                    const transaction = db.transaction([LIST_STORE], 'readwrite');
                    const store = transaction.objectStore(LIST_STORE);
                    await dbRequest(store.add(newList));
                }

                resolve({ imported, skipped, updated, importedLists: importedLists.length, total: importedProducts.length });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}
