// app.js - Lógica principal de la aplicación PriceTracker

// Variables globales
let editingProductId = null;
let currentSort = 'pricePerUnit';
let currentStoreFilter = '';
let isDenseMode = localStorage.getItem('denseMode') === 'true';

// Inicializar la aplicación
async function initApp() {
    try {
        await initDB();
        if (isDenseMode) document.getElementById('app').classList.add('dense');
        await loadProducts();
        setupEventListeners();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        alert('Error al inicializar la aplicación. Por favor, recarga la página.');
    }
}

// Cargar productos en la interfaz
async function loadProducts(filter = document.getElementById('searchInput').value) {
    try {
        let products;
        if (filter) {
            products = await searchProducts(filter);
        } else {
            products = await getAllProducts();
        }
        // Llenar filtro de tiendas
        populateStoreFilter(products);
        // Aplicar filtro de tienda
        if (currentStoreFilter) {
            products = products.filter(p => p.storeName === currentStoreFilter);
        }
        
        // Agrupar y ordenar productos
        const groupedProducts = groupAndSortProducts(products, { sortBy: currentSort });
        renderProducts(groupedProducts);
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Renderizar productos en la interfaz
function renderProducts(groupedProducts) {
    const container = document.getElementById('productsList');
    container.innerHTML = '';
    
    // Si no hay productos
    if (Object.keys(groupedProducts).length === 0) {
        container.innerHTML = '<p class="no-products">No hay productos registrados aún.</p>';
        return;
    }
    
    // Renderizar cada grupo de productos
    Object.keys(groupedProducts).forEach(productName => {
        const products = groupedProducts[productName];
        
        // Crear contenedor para el grupo
        const groupDiv = document.createElement('div');
        groupDiv.className = 'comparison-group';
        
        // Título del grupo
        const title = document.createElement('h3');
        title.className = 'comparison-title';
        title.textContent = productName;
        groupDiv.appendChild(title);
        
        // Contenedor para los productos en este grupo (grid compacto)
        const productContainer = document.createElement('div');
        productContainer.className = 'comparison-items';
        
        products.forEach((product, index) => {
            const card = createProductCard(product, index === 0); // El primer producto es el más barato
            productContainer.appendChild(card);
            // Dibujar sparkline si hay historial
            if (product.history && product.history.length > 1) {
                const canvas = card.querySelector('.sparkline');
                drawSparkline(canvas, product.history);
            }
        });
        
        groupDiv.appendChild(productContainer);
        container.appendChild(groupDiv);
    });
}

// Llenar el filtro de tiendas
function populateStoreFilter(products) {
    const storeFilter = document.getElementById('storeFilter');
    const stores = [...new Set(products.map(p => p.storeName))].sort();
    const currentVal = storeFilter.value;
    // Guardar solo los hijos que no son opciones dinámicas
    const staticOptions = Array.from(storeFilter.querySelectorAll('option[value=""]'));
    storeFilter.innerHTML = '';
    staticOptions.forEach(opt => storeFilter.appendChild(opt));
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = store;
        storeFilter.appendChild(option);
    });
    storeFilter.value = currentVal;
}

// Llenar sugerencias de productos en el datalist del formulario
async function populateProductSuggestions() {
    try {
        const products = await getAllProducts();
        const productNames = [...new Set(products.map(p => p.productName))].sort();
        const datalist = document.getElementById('productSuggestions');
        if (datalist) {
            datalist.innerHTML = '';
            productNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error poblando sugerencias de productos:', error);
    }
}

// Llenar sugerencias de tiendas en el datalist del formulario
async function populateStoreSuggestions() {
    try {
        const products = await getAllProducts();
        const stores = [...new Set(products.map(p => p.storeName))].sort();
        const datalist = document.getElementById('storeSuggestions');
        if (datalist) {
            datalist.innerHTML = '';
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error poblando sugerencias de tiendas:', error);
    }
}

// Crear tarjeta de producto
function createProductCard(product, isCheapest = false) {
    const card = document.createElement('div');
    card.className = `product-card ${isCheapest ? 'cheapest' : ''}`;
    
    const formattedPrice = parseFloat(product.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    const ppu = product.pricePerUnit
        ? `${parseFloat(product.pricePerUnit).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€/${product.unitLabel || 'u'}`
        : '';
    
    const hasHistory = product.history && product.history.length > 1;

    card.innerHTML = `
        <div class="card-main">
            <div class="product-header">
                <div class="product-name">${product.productName}</div>
                <div class="product-price">${formattedPrice}</div>
            </div>
            <div class="product-details">
                <div class="product-store">${product.storeName}</div>
                ${product.unitQty ? `<div class="product-unit">${product.unitQty} ${product.unitLabel || ''}</div>` : ''}
            </div>
            ${ppu ? `<div class="product-ppu">${ppu}</div>` : ''}
            ${hasHistory ? `
            <div class="sparkline-container">
                <canvas class="sparkline"></canvas>
            </div>` : ''}
        </div>
        <div class="card-footer">
            <div class="product-date">${product.dateAdded}</div>
            <div class="actions">
                <button class="btn icon btn-edit" title="Editar" aria-label="Editar" data-id="${product.id}">✎</button>
                <button class="btn icon btn-delete" title="Eliminar" aria-label="Eliminar" data-id="${product.id}">🗑</button>
            </div>
        </div>
    `;
    
    return card;
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Botón de añadir producto
    document.getElementById('addProductBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Añadir Producto';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        editingProductId = null;
        populateStoreSuggestions();
        populateProductSuggestions();
        document.getElementById('productModal').style.display = 'block';
    });
    
    // Cerrar modal de producto
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('productModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Enviar formulario
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Buscar productos
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadProducts(e.target.value), 200); // Debounce
    });
    
    // Botón para limpiar búsqueda
    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        const input = document.getElementById('searchInput');
        input.value = '';
        input.focus();
        loadProducts();
    });

    // Controles de orden y filtro
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadProducts();
    });

    document.getElementById('storeFilter').addEventListener('change', (e) => {
        currentStoreFilter = e.target.value;
        loadProducts();
    });

    // Modo denso
    document.getElementById('denseToggle').addEventListener('click', () => {
        isDenseMode = !isDenseMode;
        localStorage.setItem('denseMode', isDenseMode);
        document.getElementById('app').classList.toggle('dense', isDenseMode);
    });
    
    // Botón de exportar
    document.getElementById('exportBtn').addEventListener('click', async () => {
        try {
            await exportData();
            alert('Datos exportados correctamente.');
        } catch (error) {
            console.error('Error exportando datos:', error);
            alert('Error al exportar datos.');
        }
    });
    
    // Botón de importar
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    // Seleccionar archivo para importar
    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const count = await importData(file);
            alert(`${count} productos importados correctamente.`);
            loadProducts();
        } catch (error) {
            console.error('Error importando datos:', error);
            alert('Error al importar datos. El archivo puede no ser válido.');
        }
        
        // Limpiar input de archivo
        e.target.value = '';
    });
    
    // Event delegation para botones de editar y eliminar
    document.getElementById('productsList').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            editProduct(id);
        } else if (e.target.classList.contains('btn-delete')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            deleteProductPrompt(id);
        }
    });
}

// Manejar el envío del formulario de producto
async function handleProductSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const store = document.getElementById('storeName').value.trim();
    const price = document.getElementById('price').value.trim();
    const unitQty = document.getElementById('unitQty').value.trim();
    const unitLabel = document.getElementById('unitLabel').value.trim();
    
    // Validar que el precio tenga formato numérico europeo
    if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(price)) {
        alert('Por favor, introduce un precio válido (formato europeo con , o .)');
        return;
    }
    
    const product = {
        productName: name,
        storeName: store,
        price: price,
        unitQty: unitQty,
        unitLabel: unitLabel
    };
    
    try {
        if (id) {
            // Actualizar producto existente
            await updateProduct(parseInt(id), product);
        } else {
            // Crear nuevo producto
            await createProduct(product);
        }
        
        closeModal();
        loadProducts(); // Recargar productos
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error al guardar el producto.');
    }
}

// Editar producto
async function editProduct(id) {
    try {
        const product = await getProductById(id);
        if (product) {
            // Rellenar el formulario con los datos del producto
            document.getElementById('modalTitle').textContent = 'Editar Producto';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.productName;
            document.getElementById('storeName').value = product.storeName;
            document.getElementById('price').value = String(product.price).replace('.', ',');
            document.getElementById('unitQty').value = product.unitQty || '';
            document.getElementById('unitLabel').value = product.unitLabel || '';
            
            editingProductId = id;
        populateStoreSuggestions();
        populateProductSuggestions();
        document.getElementById('productModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error obteniendo producto para editar:', error);
    }
}

// Dibujar sparkline
function drawSparkline(canvas, history) {
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    ctx.strokeStyle = '#ae81ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    prices.forEach((price, index) => {
        const x = (index / (prices.length - 1)) * width;
        const y = height - (priceRange > 0 ? ((price - minPrice) / priceRange) * (height - 4) + 2 : height / 2);
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}

// Eliminar producto con confirmación
async function deleteProductPrompt(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
            await deleteProduct(id);
            loadProducts(); // Recargar productos
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto.');
        }
    }
}

// Cerrar modal
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productForm').reset();
    editingProductId = null;
}



// Iniciar la aplicación cuando se cargue la página
document.addEventListener('DOMContentLoaded', initApp);

// Registrar service worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.log('Error registrando ServiceWorker:', error);
            });
    });
}