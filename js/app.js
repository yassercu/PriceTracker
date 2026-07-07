let editingProductId = null;
let currentSort = 'pricePerUnit';
let currentStoreFilter = '';
let currentTab = 'comparator';
let isDenseMode = false;
let hasActiveSearch = false;
let editingListId = null;

function getDenseMode() {
    try { return localStorage.getItem('denseMode') === 'true'; } catch { return false; }
}

function setDenseMode(val) {
    try { localStorage.setItem('denseMode', val); } catch {}
}

function getActiveTab() {
    try { return localStorage.getItem('activeTab') || 'comparator'; } catch { return 'comparator'; }
}

function setActiveTab(val) {
    try { localStorage.setItem('activeTab', val); } catch {}
}

async function initApp() {
    try {
        await initDB();
        await migrateProducts();
        populateUnitSelect();

        const v = document.querySelector('.app-version');
        if (v) v.textContent = 'v' + APP_VERSION;
        document.title = 'PriceTracker v' + APP_VERSION;
        currentTab = getActiveTab();
        isDenseMode = getDenseMode();

        if (isDenseMode) {
            document.getElementById('app').classList.add('dense');
            document.getElementById('denseToggle').classList.add('active');
            document.getElementById('denseToggle').setAttribute('aria-pressed', 'true');
        }

        switchTab(currentTab);
        setupEventListeners();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        showToast('Error al inicializar. Recarga la página.', 'error', 5000);
    }
}

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function formatPrice(value) {
    return parseFloat(value).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function formatPPU(product) {
    if (!product.pricePerUnit) return '';
    const ppu = parseFloat(product.pricePerUnit).toLocaleString('es-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    return `${ppu} €/${product.unitLabel || 'u'}`;
}

function populateUnitSelect() {
    const select = document.getElementById('unitLabel');
    UNIT_PRESETS.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.value;
        option.textContent = preset.label;
        select.appendChild(option);
    });
}

function switchTab(tab) {
    currentTab = tab;
    setActiveTab(tab);
    document.querySelectorAll('.tab-btn').forEach(b => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
    });
    document.getElementById('comparatorView').hidden = tab !== 'comparator';
    document.getElementById('shoppingListsView').hidden = tab !== 'shoppingLists';
    document.getElementById('addProductBtn').hidden = tab !== 'comparator';
    loadTab(tab);
}

async function loadTab(tab) {
    if (tab === 'comparator') {
        await loadProducts();
    } else {
        await renderShoppingLists();
    }
}

async function loadProducts(filter) {
    try {
        const searchInput = document.getElementById('searchInput');
        const query = filter !== undefined ? filter : searchInput.value;
        hasActiveSearch = Boolean(query && query.trim());

        let products;
        if (hasActiveSearch) {
            products = await searchProducts(query);
        } else {
            products = await getAllProducts();
        }

        await populateStoreFilter();
        if (currentStoreFilter) {
            const filterNorm = normalizeName(currentStoreFilter);
            products = products.filter(p =>
                (p.storeNameNorm || normalizeName(p.storeName)) === filterNorm
            );
        }

        updateStatsBar(products);
        const groupedProducts = groupAndSortProducts(products, { sortBy: currentSort });
        renderProducts(groupedProducts, query);
    } catch (error) {
        console.error('Error cargando productos:', error);
        showToast('Error al cargar productos', 'error');
    }
}

function updateStatsBar(products) {
    const statsBar = document.getElementById('statsBar');
    if (!products.length) {
        statsBar.hidden = true;
        return;
    }

    const groups = groupProductsByName(products);
    const groupCount = Object.keys(groups).length;
    const storeCount = new Set(products.map(p => p.storeNameNorm || normalizeName(p.storeName))).size;

    statsBar.hidden = false;
    statsBar.innerHTML = `
        <span class="stat"><strong>${groupCount}</strong> productos comparables</span>
        <span class="stat"><strong>${products.length}</strong> precios registrados</span>
        <span class="stat"><strong>${storeCount}</strong> tiendas</span>
    `;
}

function highlightText(text, query) {
    if (!query || !query.trim()) return text;
    const q = normalizeName(query);
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderProducts(groupedProducts, query) {
    const container = document.getElementById('productsList');
    container.innerHTML = '';

    const groupKeys = Object.keys(groupedProducts);
    if (groupKeys.length === 0) {
        const message = hasActiveSearch || currentStoreFilter
            ? 'No hay resultados para tu búsqueda o filtro.'
            : 'Aún no hay precios. Pulsa + para registrar el primero y empezar a comparar.';
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📊</span><p>${message}</p></div>`;
        return;
    }

    groupKeys.forEach(productName => {
        const products = groupedProducts[productName];
        const best = getBestProductInGroup(products, currentSort);
        const bestValue = getComparableValue(best, currentSort);
        const worstValue = Math.max(...products.map(p => getComparableValue(p, currentSort)));
        const savings = worstValue - bestValue;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'comparison-group';

        const header = document.createElement('div');
        header.className = 'comparison-header';

        const title = document.createElement('h3');
        title.className = 'comparison-title';
        title.innerHTML = highlightText(escapeHtml(productName), query);

        const meta = document.createElement('div');
        meta.className = 'comparison-meta';
        meta.innerHTML = `
            <span class="store-count">${products.length} tienda${products.length > 1 ? 's' : ''}</span>
            ${savings > 0 && currentSort !== 'date' ? `<span class="savings">Ahorro hasta ${formatSavings(savings, currentSort, best)}</span>` : ''}
        `;

        header.appendChild(title);
        header.appendChild(meta);
        groupDiv.appendChild(header);

        const productContainer = document.createElement('div');
        productContainer.className = 'comparison-items';

        products.forEach(product => {
            const isBest = product.id === best.id;
            const card = createProductCard(product, isBest, bestValue, currentSort, query);
            productContainer.appendChild(card);
            if (product.history && product.history.length > 1) {
                const canvas = card.querySelector('.sparkline');
                drawSparkline(canvas, product.history);
            }
        });

        groupDiv.appendChild(productContainer);
        container.appendChild(groupDiv);
    });
}

function createProductCard(product, isBest, bestValue, sortBy, query) {
    const card = document.createElement('div');
    card.className = `product-card${isBest ? ' cheapest' : ''}`;

    const formattedPrice = formatPrice(product.price);
    const ppu = formatPPU(product);
    const hasHistory = product.history && product.history.length > 1;
    const currentValue = getComparableValue(product, sortBy);
    const diff = bestValue !== null && !isBest ? currentValue - bestValue : 0;

    card.innerHTML = `
        <div class="card-main">
            ${isBest ? '<span class="best-badge">Mejor opción</span>' : ''}
            <div class="product-header">
                <div class="product-store-name">${highlightText(escapeHtml(product.storeName), query)}</div>
                <div class="product-price">${formattedPrice}</div>
            </div>
            <div class="product-details">
                ${product.unitQty ? `<span class="product-unit">${product.unitQty} ${product.unitLabel || ''}</span>` : '<span class="product-unit">Sin unidad</span>'}
            </div>
            ${ppu ? `<div class="product-ppu">${ppu}</div>` : ''}
            ${diff > 0 && sortBy !== 'date' ? `<div class="price-diff">+${formatSavings(diff, sortBy, product)}</div>` : ''}
            ${hasHistory ? `<div class="sparkline-container"><canvas class="sparkline"></canvas></div>` : ''}
        </div>
        <div class="card-footer">
            <span class="product-date">${product.dateAdded}</span>
            <div class="actions">
                <button class="btn icon btn-edit" title="Editar" aria-label="Editar" data-id="${product.id}">✎</button>
                <button class="btn icon btn-delete" title="Eliminar" aria-label="Eliminar" data-id="${product.id}">🗑</button>
            </div>
        </div>
    `;

    return card;
}

function formatSavings(amount, sortBy, bestProduct) {
    if (sortBy === 'price' || (sortBy === 'pricePerUnit' && !bestProduct.pricePerUnit)) {
        return formatPrice(amount);
    }
    if (sortBy === 'pricePerUnit') {
        return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${bestProduct.unitLabel || 'u'}`;
    }
    return '';
}

async function populateStoreFilter() {
    const storeFilter = document.getElementById('storeFilter');
    const stores = await getUniqueStores();
    const currentVal = storeFilter.value;
    const currentNorm = currentVal ? normalizeName(currentVal) : '';

    storeFilter.innerHTML = '<option value="">Todas las tiendas</option>';
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = store;
        storeFilter.appendChild(option);
    });

    const restored = stores.find(s => normalizeName(s) === currentNorm);
    storeFilter.value = restored || '';
    if (!restored) currentStoreFilter = '';
}

async function populateProductSuggestions() {
    try {
        const products = await getAllProducts();
        const nameMap = new Map();
        products.forEach(p => {
            const norm = p.productNameNorm || normalizeName(p.productName);
            if (!nameMap.has(norm) || p.productName.length > nameMap.get(norm).length) {
                nameMap.set(norm, p.productName);
            }
        });
        const datalist = document.getElementById('productSuggestions');
        datalist.innerHTML = '';
        [...nameMap.values()].sort((a, b) => a.localeCompare(b, 'es')).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error poblando sugerencias:', error);
    }
}

async function renderStoreChips() {
    const container = document.getElementById('storeChips');
    const stores = await getUniqueStores();
    container.innerHTML = '';

    if (!stores.length) {
        container.innerHTML = '<span class="chips-empty">Sin tiendas aún — la primera que guardes quedará registrada</span>';
        return;
    }

    stores.forEach(store => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'store-chip';
        chip.textContent = store;
        chip.title = `Usar ${store}`;
        chip.addEventListener('click', () => {
            document.getElementById('storeName').value = store;
            checkDuplicateWarning();
        });
        container.appendChild(chip);
    });
}

async function populateStoreSuggestions() {
    try {
        const stores = await getUniqueStores();
        const datalist = document.getElementById('storeSuggestions');
        datalist.innerHTML = '';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            datalist.appendChild(option);
        });
        await renderStoreChips();
    } catch (error) {
        console.error('Error poblando sugerencias de tiendas:', error);
    }
}

function updatePpuPreview() {
    const price = document.getElementById('price').value.trim();
    const unitQty = document.getElementById('unitQty').value.trim();
    const unitLabel = document.getElementById('unitLabel').value;
    const preview = document.getElementById('ppuPreview');

    if (!price || !unitQty || !unitLabel) {
        preview.hidden = true;
        return;
    }

    if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(price)) {
        preview.hidden = true;
        return;
    }

    const ppu = computePricePerUnit(priceToNumber(price), unitQty);
    if (ppu) {
        preview.hidden = false;
        preview.innerHTML = `Precio normalizado: <strong>${ppu.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unitLabel}</strong>`;
    } else {
        preview.hidden = true;
    }
}

async function checkDuplicateWarning() {
    const name = document.getElementById('productName').value.trim();
    const store = document.getElementById('storeName').value.trim();
    const warning = document.getElementById('duplicateWarning');
    const id = document.getElementById('productId').dataset.editId;

    if (!name || !store) {
        warning.hidden = true;
        return;
    }

    const stores = await getUniqueStores();
    const canonicalStore = resolveCanonicalStoreName(store, stores);
    const duplicate = await findProductByNameAndStore(name, canonicalStore, id ? parseInt(id) : null);

    if (duplicate) {
        warning.hidden = false;
        warning.innerHTML = `Ya existe en <strong>${duplicate.storeName}</strong> (${formatPrice(duplicate.price)}). Al guardar se actualizará el precio.`;
    } else {
        warning.hidden = true;
    }
}

async function preprocessImage(file) {
    try {
        let img;
        try {
            img = await createImageBitmap(file);
        } catch {
            const url = URL.createObjectURL(file);
            img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = url;
            });
        }

        const MAX_SIDE = 1600;
        const { width, height } = img;
        const scale = Math.max(1, MAX_SIDE / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        try {
            ctx.filter = 'grayscale(1) contrast(1.7) brightness(1.05)';
        } catch { /* canvas filter no soportado */ }

        ctx.drawImage(img, 0, 0, w, h);

        if (img && typeof img.close === 'function') img.close();

        return canvas;
    } catch (error) {
        console.error('preprocessImage falló, usando archivo original:', error);
        return file;
    }
}

async function ocrImage(img) {
    const worker = await Tesseract.createWorker('spa+fra');
    try {
        const { data } = await worker.recognize(img);
        return data;
    } finally {
        await worker.terminate();
    }
}

function extractLines(data) {
    let lines = [];

    if (data && data.lines && data.lines.length) {
        lines = data.lines.map(line => {
            const bbox = line.bbox || {};
            const x0 = bbox.x0 || 0, y0 = bbox.y0 || 0;
            const x1 = bbox.x1 || 0, y1 = bbox.y1 || 0;
            return {
                text: (line.text || '').trim(),
                confidence: line.confidence != null ? line.confidence : 0,
                top: y0,
                left: x0,
                width: x1 - x0,
                height: y1 - y0
            };
        }).filter(l => l.text.length > 0);
    } else if (data && data.text) {
        lines = data.text.split('\n')
            .map(t => ({ text: t.trim(), confidence: 0, top: 0, left: 0, width: 0, height: 0 }))
            .filter(l => l.text.length > 0);
    }

    lines.sort((a, b) => a.top - b.top || a.left - b.left);

    const maxHeight = lines.reduce((m, l) => Math.max(m, l.height || 0), 0) || 1;
    lines.forEach(l => { l.relHeight = (l.height || 0) / maxHeight; });
    lines.maxHeight = maxHeight;

    return lines;
}

function capitalizeWords(str) {
    return str.toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

function parsePriceCard(lines) {
    const result = {
        name: '', price: '', unitQty: '', unitLabel: '',
        detected: { price: false, unit: false, name: false }
    };
    if (!lines || !lines.length) return result;

    const UNIT_VOCAB = 'g|gr|gram|kg|kilo|l|litro|ml|cl|mg|ud|uds|unidad|unid|u|unit|pack|paq|docena|lx|sobres|tabletas|pièce|pièces|sachet|sachets|barquette|bocal|flacon|lot|tranche|tranches|dose|doses|poignée';
    const unitRegex = new RegExp('(' + UNIT_VOCAB + ')', 'i');
    const packRegex = new RegExp('(\\d+)\\s*[x×*]\\s*(\\d+(?:[.,]\\d+)?)\\s*(' + UNIT_VOCAB + ')', 'i');
    const singleRegex = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*(' + UNIT_VOCAB + ')', 'i');
    const amountRegex = /(\d{1,3}(?:[.,]\d{1,2})?)/g;
    const altAmountRegex = /(\d+)[.,](\d{2})/g;
    const ppuLineRegex = /PVP|UNITARIO|\/100|\/kg|\/l\b|PPU|PRIX.*UNIT|PRIX.*KIL|PRIX.*LITR|TARIF.*KIL|TARIF.*LITR/i;

    const isBarcodeText = (t) => t.replace(/\D/g, '').length >= 8;

    // ---------- PRICE ----------
    let bestPrice = null;

    lines.forEach((line, idx) => {
        const t = line.text;
        const up = t.toUpperCase();

        const hasCurrency = /[€]/.test(t) || /\bEURO?S?\b/.test(up);
        const hasKeyword = /PRECIO|PRICE|PRIX|PVP|UNIT|UNITARIO|TARIF|CO[UÛ]T|TTC/.test(up);
        const hasUnit = unitRegex.test(t);
        const bigText = (line.relHeight || 0) > 0.8;
        const barcode = isBarcodeText(t);

        const candidates = new Set();
        let m;
        amountRegex.lastIndex = 0;
        while ((m = amountRegex.exec(t)) !== null) candidates.add(m[1]);
        altAmountRegex.lastIndex = 0;
        while ((m = altAmountRegex.exec(t)) !== null) candidates.add(m[1] + ',' + m[2]);

        const frBetweenRegex = /(\d+)€(\d{2})/g;
        let mf;
        frBetweenRegex.lastIndex = 0;
        while ((mf = frBetweenRegex.exec(t)) !== null) candidates.add(mf[1] + ',' + mf[2]);

        candidates.forEach(amount => {
            let score = 0;
            if (hasCurrency) score += 3;
            if (hasKeyword) score += 2;
            if (hasUnit) score += 1;
            if (bigText) score += 1;
            if (barcode) score -= 3;
            if (hasUnit && !hasCurrency && !hasKeyword) score -= 3;
            const num = parseFloat(amount.replace(',', '.'));
            if (num > 200) score -= 1;

            if (bestPrice === null || score > bestPrice.score) {
                bestPrice = { amount, score, lineIndex: idx };
            }
        });
    });

    if (bestPrice) {
        let amt = bestPrice.amount;
        const dotIdx = amt.indexOf('.');
        if (dotIdx !== -1) {
            const frac = amt.slice(dotIdx + 1);
            if (frac.length === 2) amt = amt.replace('.', ',');
        }
        result.price = amt;
        result.detected.price = true;
    }
    const priceLineIndex = bestPrice ? bestPrice.lineIndex : -1;

    // ---------- UNIT / QUANTITY ----------
    let bestUnit = null;

    lines.forEach((line, idx) => {
        const t = line.text;
        if (ppuLineRegex.test(t.toUpperCase())) return;

        const packMatch = t.match(packRegex);
        if (packMatch) {
            const qty = parseFloat(packMatch[1]) * parseFloat(packMatch[2].replace(',', '.'));
            const norm = normalizeUnitLabel(packMatch[3]);
            if (!bestUnit || qty > bestUnit.qty) {
                bestUnit = { qty, unit: norm, lineIndex: idx };
            }
            return;
        }

        const m = t.match(singleRegex);
        if (m) {
            const before = t.slice(0, m.index);
            if (/\/\s*$/.test(before)) return;
            const qty = parseFloat(m[1].replace(',', '.'));
            const norm = normalizeUnitLabel(m[2]);
            if (!bestUnit || qty > bestUnit.qty) {
                bestUnit = { qty, unit: norm, lineIndex: idx };
            }
        }
    });

    if (bestUnit) {
        result.unitQty = String(bestUnit.qty);
        result.unitLabel = bestUnit.unit;
        result.detected.unit = true;
    }

    // ---------- NAME ----------
    const STOPWORDS = [
        'INGREDIENTES', 'INGREDIENTS', 'INGRÉDIENTS',
        'CADUCIDAD', 'CONSERVAR', 'CONSERVER',
        'FABRICADO', 'FABRIQUÉ', 'FABRICANT',
        'MODO', 'MODE', 'USO', 'EMPLOI',
        'VALOR', 'VALEURS', 'ENERG', 'ÉNERGIE',
        'NUTRIC', 'NUTRITION', 'NUTRITIONNELLES',
        'GLUTEN', 'AZUCAR', 'AZÚCAR', 'SUCRES',
        'PROTEIN', 'PROTÉINES', 'GRASA', 'GRAS', 'LIPIDES', 'FIBRES', 'SODIUM',
        'DISTRIBUID', 'DISTRIBUÉ',
        'LTE', 'INFO', 'INFORMATIONS', 'WWW', 'HTTP', '.COM', '.ES', '.FR',
        'S.L', 'S.A', 'SARL', 'SAS', 'EURL', 'SNC',
        'MARCA', 'MARQUE', 'NETO', 'NETTE', 'PESO', 'POIDS',
        'PRODUCTO', 'PRODUIT', 'TTC', 'HT',
        'DEMANDEZ', 'TENEUR', 'TRACES', 'LOT'
    ];

    const nameCandidates = [];
    lines.forEach((line, idx) => {
        const t = line.text.trim();
        if (idx === priceLineIndex) return;
        if (!t || t.length < 3 || t.length > 45) return;
        if (line.confidence > 0 && line.confidence < 45) return;
        if (isBarcodeText(t)) return;
        const up = t.toUpperCase();
        const upNorm = up.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (STOPWORDS.some(sw => upNorm.includes(sw))) return;
        if (/^[€]?\s*\d/.test(t) && /[€]/i.test(t)) return;

        let score = 0;
        if (!/^[A-ZÁÉÍÓÚÑÀÂÇÈÊËÏÎÔÙÛÜ0-9\s]+$/.test(t)) score += 1;
        if (/\s/.test(t)) score += 1;
        if (line.confidence >= 70) score += 1;
        nameCandidates.push({ text: t, score });
    });

    if (nameCandidates.length) {
        nameCandidates.sort((a, b) => b.score - a.score);
        result.name = capitalizeWords(nameCandidates[0].text);
        result.detected.name = true;
    } else {
        const fb = lines.find((l, idx) =>
            idx !== priceLineIndex && !isBarcodeText(l.text) && l.text.trim().length >= 3);
        result.name = capitalizeWords(fb ? fb.text.trim() : (lines[0] ? lines[0].text : ''));
    }

    return result;
}

function applyParsedToForm(parsed) {
    if (parsed.name) document.getElementById('productName').value = parsed.name;
    if (parsed.price) {
        document.getElementById('price').value = parsed.price;
        updatePpuPreview();
    }
    if (parsed.unitQty) document.getElementById('unitQty').value = parsed.unitQty;
    if (parsed.unitLabel) {
        const select = document.getElementById('unitLabel');
        const normUnit = normalizeUnitLabel(parsed.unitLabel);

        if (normUnit === 'cl' && ![...select.options].some(opt => opt.value === 'cl')) {
            const opt = document.createElement('option');
            opt.value = 'cl';
            opt.textContent = 'Centilitro (cl)';
            select.appendChild(opt);
        }

        if ([...select.options].some(opt => opt.value === normUnit)) {
            select.value = normUnit;
        } else {
            select.value = normUnit || '';
        }
    }
    checkDuplicateWarning();
}

function openConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    msgEl.textContent = message;
    modal.style.display = 'flex';

    const cleanup = () => {
        modal.style.display = 'none';
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        modal.removeEventListener('click', handleOutside);
    };

    const handleYes = () => { cleanup(); onConfirm(); };
    const handleNo = () => { cleanup(); };
    const handleOutside = (e) => { if (e.target === modal) cleanup(); };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    modal.addEventListener('click', handleOutside);
}

async function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Añadir precio';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productId').dataset.editId = '';
    document.getElementById('duplicateWarning').hidden = true;
    document.getElementById('ppuPreview').hidden = true;
    editingProductId = null;
    document.getElementById('scanSection').hidden = false;
    document.getElementById('scanSection').style.display = '';
    await populateStoreSuggestions();
    await populateProductSuggestions();
    document.getElementById('productModal').style.display = 'flex';
    document.getElementById('productName').focus();
}

async function handleProductSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('productId').dataset.editId;
    const name = document.getElementById('productName').value.trim();
    const store = document.getElementById('storeName').value.trim();
    const price = document.getElementById('price').value.trim();
    const unitQty = document.getElementById('unitQty').value.trim();
    const unitLabel = document.getElementById('unitLabel').value;

    const priceInput = document.getElementById('price');
    if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(price)) {
        priceInput.classList.add('input-error');
        showToast('Introduce un precio válido (ej: 1,99)', 'error');
        priceInput.focus();
        return;
    }
    priceInput.classList.remove('input-error');

    const [stores, allProducts] = await Promise.all([getUniqueStores(), getAllProducts()]);
    const productNames = [...new Set(allProducts.map(p => p.productName))];
    const canonicalStore = resolveCanonicalStoreName(store, stores);
    const canonicalName = resolveCanonicalProductName(name, productNames);

    const product = { productName: canonicalName, storeName: canonicalStore, price, unitQty, unitLabel };

    try {
        if (id) {
            await updateProduct(Number(id), product);
            showToast('Precio actualizado', 'success');
        } else {
            await createProduct(product);
            showToast(`Precio añadido en ${canonicalStore}`, 'success');
        }

        closeModal();
        loadProducts();
    } catch (error) {
        if (error.message === 'DUPLICATE_PRODUCT') {
            await updateProduct(error.existingProduct.id, product);
            showToast(`Precio actualizado en ${canonicalStore}`, 'success');
            closeModal();
            loadProducts();
        } else {
            console.error('Error guardando producto:', error);
            showToast('Error al guardar el producto', 'error');
        }
    }
}

async function editProduct(id) {
    try {
        const product = await getProductById(id);
        if (!product) return;

        document.getElementById('modalTitle').textContent = 'Editar precio';
        document.getElementById('productId').dataset.editId = product.id;
        document.getElementById('productName').value = product.productName;
        document.getElementById('storeName').value = product.storeName;
        document.getElementById('price').value = String(product.price).replace('.', ',');
        document.getElementById('unitQty').value = product.unitQty || '';
        document.getElementById('unitLabel').value = product.unitLabel || '';

        editingProductId = id;
        document.getElementById('scanSection').hidden = true;
        document.getElementById('scanSection').style.display = 'none';
        await populateStoreSuggestions();
        await populateProductSuggestions();
        updatePpuPreview();
        checkDuplicateWarning();
        document.getElementById('productModal').style.display = 'flex';
    } catch (error) {
        console.error('Error obteniendo producto para editar:', error);
    }
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productForm').reset();
    document.getElementById('duplicateWarning').hidden = true;
    document.getElementById('ppuPreview').hidden = true;
    editingProductId = null;
}

function drawSparkline(canvas, history) {
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    ctx.fillStyle = 'rgba(174, 129, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    prices.forEach((price, index) => {
        const x = (index / (prices.length - 1)) * width;
        const y = priceRange > 0
            ? height - ((price - minPrice) / priceRange) * (height - 4) - 2
            : height / 2;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ae81ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    prices.forEach((price, index) => {
        const x = (index / (prices.length - 1)) * width;
        const y = priceRange > 0
            ? height - ((price - minPrice) / priceRange) * (height - 4) - 2
            : height / 2;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

async function deleteProductPrompt(id) {
    const product = await getProductById(id);
    if (!product) return;
    openConfirmModal(
        `¿Eliminar "${product.productName}" en ${product.storeName}?`,
        async () => {
            try {
                await deleteProduct(id);
                showToast('Precio eliminado', 'success');
                loadProducts();
            } catch (error) {
                console.error('Error eliminando producto:', error);
                showToast('Error al eliminar', 'error');
            }
        }
    );
}

// --- Shopping List UI ---

async function populateShoppingListSuggestions() {
    try {
        const products = await getAllProducts();
        const names = [...new Set(products.map(p => p.productName))].sort((a, b) => a.localeCompare(b, 'es'));
        const datalist = document.getElementById('shoppingListSuggest');
        datalist.innerHTML = '';
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            datalist.appendChild(opt);
        });
    } catch (e) { /* ignore */ }
}

async function renderShoppingLists() {
    const container = document.getElementById('shoppingListsContainer');
    await populateShoppingListSuggestions();
    const lists = await getAllShoppingLists();

    if (!lists.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🛒</span>
                <p>Aún no tienes listas de compra. Crea una para empezar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="lists-grid"></div>';
    const grid = container.querySelector('.lists-grid');

    for (const list of lists) {
        const suggestions = list.items.length ? await getSmartSuggestions(list.id) : [];
        const total = suggestions.reduce((sum, s) => sum + (s.best ? s.best.price : 0), 0);
        const checkedItems = list.items.filter(i => i.checked).length;

        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
            <div class="list-card-header">
                <div class="list-card-title-row">
                    <h3 class="list-card-title">${escapeHtml(list.name)}</h3>
                    <button class="btn icon btn-delete-list" title="Eliminar lista" aria-label="Eliminar lista" data-list-id="${list.id}">🗑</button>
                </div>
                <div class="list-card-meta">
                    <span>${list.items.length} producto${list.items.length !== 1 ? 's' : ''}</span>
                    ${checkedItems > 0 ? `<span class="list-checked-count">${checkedItems}✓</span>` : ''}
                    ${total > 0 ? `<span class="list-total">Total ≈ ${formatPrice(total)}</span>` : ''}
                </div>
            </div>
            <div class="list-card-items">
                ${list.items.length === 0 ? '<p class="list-empty-msg">Lista vacía — añade productos</p>' :
                list.items.map(item => {
                    const s = suggestions.find(sg => sg.item.id === item.id);
                    const best = s ? s.best : null;
                    return `
                        <div class="list-item ${item.checked ? 'checked' : ''}" data-item-id="${item.id}">
                            <label class="list-item-check">
                                <input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.productName)}">
                            </label>
                            <div class="list-item-info">
                                <span class="list-item-name ${item.checked ? 'checked-text' : ''}">${escapeHtml(item.productName)}</span>
                                ${best ? `<span class="list-item-suggestion">Mejor en <strong>${escapeHtml(best.store)}</strong> — ${formatPrice(best.price)}</span>` : ''}
                                ${!best ? '<span class="list-item-suggestion no-data">Sin datos de precio</span>' : ''}
                            </div>
                            <div class="list-item-actions">
                                <button class="btn icon btn-remove-item" title="Quitar" aria-label="Quitar" data-item-id="${item.id}">✕</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="list-card-footer">
                <form class="add-item-form" data-list-id="${list.id}">
                    <input type="text" class="add-item-input" placeholder="Añadir producto..." list="shoppingListSuggest" autocomplete="off" required>
                    <button type="submit" class="btn-add-item" title="Añadir">+</button>
                </form>
                <div class="list-card-actions">
                    <button class="btn-secondary btn-show-options" data-list-id="${list.id}">Ver mejores opciones</button>
                </div>
            </div>
        `;

        grid.appendChild(card);

        const form = card.querySelector('.add-item-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = form.querySelector('.add-item-input');
            const name = input.value.trim();
            if (!name) return;
            await addListItem(list.id, { productName: name });
            input.value = '';
            renderShoppingLists();
        });

        card.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
            const item = list.items[idx];
            cb.addEventListener('change', async () => {
                await updateListItem(list.id, item.id, { checked: cb.checked });
                const itemEl = cb.closest('.list-item');
                itemEl.classList.toggle('checked', cb.checked);
                const nameEl = itemEl.querySelector('.list-item-name');
                if (nameEl) nameEl.classList.toggle('checked-text', cb.checked);
                const checkedCount = card.querySelectorAll('input[type="checkbox"]:checked').length;
                let countEl = card.querySelector('.list-checked-count');
                if (checkedCount > 0) {
                    if (countEl) {
                        countEl.textContent = `${checkedCount}✓`;
                    } else {
                        const meta = card.querySelector('.list-card-meta');
                        countEl = document.createElement('span');
                        countEl.className = 'list-checked-count';
                        meta.appendChild(countEl);
                        countEl.textContent = `${checkedCount}✓`;
                    }
                } else if (countEl) {
                    countEl.remove();
                }
            });
        });

        card.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = parseFloat(btn.dataset.itemId);
                await removeListItem(list.id, itemId);
                renderShoppingLists();
            });
        });

        card.querySelector('.btn-delete-list')?.addEventListener('click', () => {
            openConfirmModal(`¿Eliminar la lista "${list.name}"?`, async () => {
                await deleteShoppingList(list.id);
                renderShoppingLists();
                showToast('Lista eliminada', 'info');
            });
        });

        card.querySelector('.btn-show-options')?.addEventListener('click', () => {
            showShoppingListOptions(list, suggestions);
        });
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function showShoppingListOptions(list, suggestions) {
    const total = suggestions.reduce((sum, s) => sum + (s.best ? s.best.price : 0), 0);
    const modal = document.getElementById('optionsModal');
    const content = document.getElementById('optionsContent');

    let html = `<h3>${escapeHtml(list.name)} — Mejores opciones</h3>`;

    const withData = suggestions.filter(s => s.best);
    const withoutData = suggestions.filter(s => !s.best);

    if (withData.length) {
        html += `<table class="options-table">
            <thead><tr><th>Producto</th><th>Tienda</th><th>Precio</th><th>PPU</th></tr></thead>
            <tbody>
        `;
        withData.forEach(s => {
            html += `<tr>
                <td>${escapeHtml(s.item.productName)}</td>
                <td><strong>${escapeHtml(s.best.store)}</strong></td>
                <td>${formatPrice(s.best.price)}</td>
                <td>${s.best.pricePerUnit ? formatPPU(s.best) : '-'}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        html += `<div class="options-total">Total estimado: <strong>${formatPrice(total)}</strong></div>`;
    }

    if (withoutData.length) {
        html += `<div class="options-no-data">
            <p>Sin datos de precio para:</p>
            <ul>${withoutData.map(s => `<li>${escapeHtml(s.item.productName)}</li>`).join('')}</ul>
        </div>`;
    }

    if (!withData.length && !withoutData.length) {
        html += `<p class="options-empty">La lista está vacía</p>`;
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
    modal.querySelector('.close-options').addEventListener('click', () => { modal.style.display = 'none'; }, { once: true });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; }, { once: true });
}

function openNewListModal() {
    let dialog = document.getElementById('newListDialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'newListDialog';
        dialog.className = 'modal-dialog';
        dialog.innerHTML = `
            <form method="dialog" class="new-list-form">
                <h3>Nueva lista</h3>
                <input type="text" class="new-list-input" placeholder="Nombre de la lista" autocomplete="off" required>
                <div class="new-list-actions">
                    <button type="button" class="btn-secondary new-list-cancel">Cancelar</button>
                    <button type="submit" class="btn-primary new-list-create">Crear</button>
                </div>
            </form>
        `;
        document.getElementById('app').appendChild(dialog);

        const form = dialog.querySelector('.new-list-form');
        const input = dialog.querySelector('.new-list-input');
        form.addEventListener('submit', () => {
            const name = input.value.trim();
            input.value = '';
            if (name) {
                createShoppingList(name).then(() => {
                    renderShoppingLists();
                    showToast('Lista creada', 'success');
                });
            }
            dialog.close();
        });
        dialog.querySelector('.new-list-cancel').addEventListener('click', () => {
            input.value = '';
            dialog.close();
        });
    }
    dialog.querySelector('.new-list-input').value = '';
    dialog.showModal();
}

// --- Event Listeners ---

function setupEventListeners() {
    document.getElementById('addProductBtn').addEventListener('click', openAddModal);

    document.getElementById('addListBtn').addEventListener('click', openNewListModal);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const scanBtn = document.getElementById('scanBtn');
    const scanInput = document.getElementById('scanInput');
    const scanLoading = document.getElementById('scanLoading');

    scanBtn.addEventListener('click', () => scanInput.click());

    document.getElementById('demoScanBtn').addEventListener('click', async (e) => {
        e.preventDefault();

        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111111';
        ctx.textBaseline = 'top';

        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('Fingers de Pollo', 30, 40);

        ctx.font = '24px sans-serif';
        ctx.fillText('Hacendado', 30, 90);

        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('PRECIO  2,49 €', 30, 150);

        ctx.font = '28px sans-serif';
        ctx.fillText('500 g', 30, 210);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('Conservar refrigerado', 30, 270);

        try {
            const image = await preprocessImage(canvas);
            const data = await ocrImage(image);
            const lines = extractLines(data);
            const parsed = parsePriceCard(lines);
            applyParsedToForm(parsed);
            showToast('Demo OCR: ' + (parsed.name || '—') + ' · ' +
                (parsed.price ? parsed.price + ' €' : 'precio?') +
                (parsed.unitLabel ? ' · ' + parsed.unitQty + parsed.unitLabel : ''), 'success');
        } catch (error) {
            console.error('Demo OCR Error:', error);
            showToast('No se pudo leer la imagen de demostración', 'error');
        }
    });

    scanInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        scanBtn.hidden = true;
        scanLoading.hidden = false;

        try {
            const image = await preprocessImage(file);
            const data = await ocrImage(image);
            const lines = extractLines(data);
            const parsed = parsePriceCard(lines);

            applyParsedToForm(parsed);

            showToast('Leído: ' + (parsed.name || '—') + ' · ' +
                (parsed.price ? parsed.price + ' €' : 'precio?') +
                (parsed.unitLabel ? ' · ' + parsed.unitQty + parsed.unitLabel : ''), 'success');
        } catch (error) {
            console.error('OCR Error:', error);
            showToast('No se pudo leer la imagen correctamente', 'error');
        } finally {
            scanBtn.hidden = false;
            scanLoading.hidden = true;
            scanInput.value = '';
        }
    });

    document.querySelector('#productModal .close').addEventListener('click', closeModal);
    document.getElementById('productModal').addEventListener('click', (event) => {
        if (event.target === document.getElementById('productModal')) closeModal();
    });

    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadProducts(e.target.value), 200);
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        const input = document.getElementById('searchInput');
        input.value = '';
        input.focus();
        loadProducts();
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadProducts();
    });

    document.getElementById('storeFilter').addEventListener('change', (e) => {
        currentStoreFilter = e.target.value;
        loadProducts();
    });

    document.getElementById('denseToggle').addEventListener('click', () => {
        isDenseMode = !isDenseMode;
        setDenseMode(isDenseMode);
        document.getElementById('app').classList.toggle('dense', isDenseMode);
        const btn = document.getElementById('denseToggle');
        btn.classList.toggle('active', isDenseMode);
        btn.setAttribute('aria-pressed', String(isDenseMode));
    });

    document.getElementById('exportBtn').addEventListener('click', async () => {
        try {
            await exportData();
            showToast('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exportando datos:', error);
            showToast('Error al exportar datos', 'error');
        }
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await importData(file, { merge: true });
            const parts = [];
            if (result.imported) parts.push(`${result.imported} nuevos`);
            if (result.updated) parts.push(`${result.updated} actualizados`);
            if (result.skipped) parts.push(`${result.skipped} sin cambios`);
            if (result.importedLists) parts.push(`${result.importedLists} listas`);
            showToast(`Importación: ${parts.join(', ')}`, 'success');
            loadProducts();
            renderShoppingLists();
        } catch (error) {
            console.error('Error importando datos:', error);
            showToast('Archivo no válido o error al importar', 'error');
        }

        e.target.value = '';
    });

    document.getElementById('productsList').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            editProduct(Number(e.target.getAttribute('data-id')));
        } else if (e.target.classList.contains('btn-delete')) {
            deleteProductPrompt(Number(e.target.getAttribute('data-id')));
        }
    });

    ['productName', 'storeName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                el.classList.remove('input-error');
                clearTimeout(window._dupTimeout);
                window._dupTimeout = setTimeout(checkDuplicateWarning, 300);
            });
        }
    });

    ['price', 'unitQty', 'unitLabel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePpuPreview);
            el.addEventListener('change', updatePpuPreview);
        }
    });

    const unitLabel = document.getElementById('unitLabel');
    if (unitLabel) {
        unitLabel.addEventListener('change', (e) => {
            const preset = UNIT_PRESETS.find(p => p.value === e.target.value);
            const qtyInput = document.getElementById('unitQty');
            if (preset && !qtyInput.value) {
                qtyInput.value = preset.defaultQty;
                updatePpuPreview();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initApp);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swPath = new URL('service-worker.js', window.location.href).pathname;
        navigator.serviceWorker.register(swPath)
            .then(registration => {
                console.log('ServiceWorker registrado:', registration.scope);
                navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
            })
            .catch(error => console.log('Error registrando ServiceWorker:', error));
    });
}
