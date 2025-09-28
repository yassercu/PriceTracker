// db.js - Gestión de IndexedDB para PriceTracker

const DB_NAME = 'PriceTrackerDB';
const DB_VERSION = 2;
const STORE_NAME = 'products';

// Variable para almacenar la conexión a la base de datos
let db;

// Utilidades
function normalizeName(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function priceToNumber(p) {
    // acepta coma o punto
    if (typeof p === 'number') return p;
    return parseFloat(String(p).replace(',', '.')) || 0;
}

function computePricePerUnit(priceNum, unitQty) {
    const qty = parseFloat(unitQty);
    if (!qty || qty <= 0) return null;
    return priceNum / qty;
}

// Inicializar la base de datos
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
            let objectStore;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            } else {
                objectStore = event.target.transaction.objectStore(STORE_NAME);
            }
            // Asegurar índices
            if (!objectStore.indexNames.contains('productName')) {
                objectStore.createIndex('productName', 'productName', { unique: false });
            }
            if (!objectStore.indexNames.contains('productNameNorm')) {
                objectStore.createIndex('productNameNorm', 'productNameNorm', { unique: false });
            }
            if (!objectStore.indexNames.contains('dateAdded')) {
                objectStore.createIndex('dateAdded', 'dateAdded', { unique: false });
            }
        };
    });
}

// Crear un nuevo producto
function createProduct(product) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Añadir fecha de creación
        const priceNum = priceToNumber(product.price);
        const ppu = computePricePerUnit(priceNum, product.unitQty);
        const now = new Date();
        const productWithDate = {
            ...product,
            price: String(priceNum).replace('.', '.'),
            productNameNorm: normalizeName(product.productName),
            pricePerUnit: ppu,
            dateAdded: now.toLocaleDateString('es-ES'),
            history: [{ date: now.toISOString(), price: priceNum }]
        };
        
        const request = store.add(productWithDate);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener todos los productos
function getAllProducts() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener un producto por ID
function getProductById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Actualizar un producto
function updateProduct(id, updatedProduct) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => {
            const product = request.result;
            // Mantener la fecha original pero actualizar la de modificación
            const priceNum = priceToNumber(updatedProduct.price);
            const ppu = computePricePerUnit(priceNum, updatedProduct.unitQty);
            const nowISO = new Date().toISOString();
            const history = Array.isArray(product.history) ? product.history.slice() : [];
            if (priceToNumber(product.price) !== priceNum) {
                history.push({ date: nowISO, price: priceNum });
            }
            const updatedProductWithDate = {
                ...updatedProduct,
                id: product.id,
                productNameNorm: normalizeName(updatedProduct.productName),
                price: String(priceNum),
                pricePerUnit: ppu,
                dateAdded: product.dateAdded,
                history
            };
            
            const updateRequest = store.put(updatedProductWithDate);
            updateRequest.onsuccess = () => resolve(updateRequest.result);
            updateRequest.onerror = () => reject(updateRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Eliminar un producto
function deleteProduct(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Buscar productos por nombre
function searchProducts(query) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        // obtener todos para poder normalizar en caliente si hiciera falta
        const request = store.getAll();
        
        request.onsuccess = () => {
            const products = request.result;
            const qn = normalizeName(query);
            // Rellenar productNameNorm si falta (migración suave)
            products.forEach(p => {
                if (!p.productNameNorm) p.productNameNorm = normalizeName(p.productName);
            });
            const filteredProducts = qn
                ? products.filter(product => product.productNameNorm.includes(qn))
                : products;
            resolve(filteredProducts);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Agrupar productos por nombre
function groupProductsByName(products) {
    const grouped = {};
    products.forEach(product => {
        const key = product.productNameNorm || normalizeName(product.productName);
        if (!grouped[key]) {
            grouped[key] = { displayName: product.productName, items: [] };
        }
        grouped[key].items.push(product);
        // actualizar displayName si el actual es más largo/informativo
        if (product.productName.length > grouped[key].displayName.length) {
            grouped[key].displayName = product.productName;
        }
    });
    return grouped;
}

// Agrupar y ordenar productos por precio
function groupAndSortProducts(products, options = {}) {
    const { sortBy = 'pricePerUnit' } = options; // 'pricePerUnit' | 'price' | 'date'
    const groupedRaw = groupProductsByName(products);
    const grouped = {};
    Object.keys(groupedRaw).forEach(key => {
        const arr = groupedRaw[key].items.slice();
        arr.sort((a, b) => {
            const pa = priceToNumber(a.price);
            const pb = priceToNumber(b.price);
            const pua = a.pricePerUnit ?? computePricePerUnit(pa, a.unitQty) ?? pa;
            const pub = b.pricePerUnit ?? computePricePerUnit(pb, b.unitQty) ?? pb;
            if (sortBy === 'date') {
                return new Date(a.dateAdded) - new Date(b.dateAdded);
            }
            if (sortBy === 'price') {
                return pa - pb;
            }
            // default: pricePerUnit
            return pua - pub;
        });
        grouped[groupedRaw[key].displayName] = arr;
    });
    return grouped;
}

// Exportar todos los datos
async function exportData() {
    try {
        const products = await getAllProducts();
        const data = {
            products: products,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'price-tracker-backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    } catch (error) {
        console.error('Error al exportar datos:', error);
        throw error;
    }
}

// Importar datos
async function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                const products = importedData.products || [];
                
                // Añadir los productos importados a la base de datos
                for (const product of products) {
                    // Eliminar el ID para que se genere uno nuevo
                    delete product.id;
                    await createProduct(product);
                }
                
                resolve(products.length);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}