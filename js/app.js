// app.js - Lógica principal de la aplicación PriceTracker

// Variables globales
let editingProductId = null;

// Inicializar la aplicación
async function initApp() {
    try {
        await initDB();
        await loadProducts();
        setupEventListeners();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        alert('Error al inicializar la aplicación. Por favor, recarga la página.');
    }
}

// Cargar productos en la interfaz
async function loadProducts(filter = '') {
    try {
        let products;
        if (filter) {
            products = await searchProducts(filter);
        } else {
            products = await getAllProducts();
        }
        
        // Agrupar y ordenar productos
        const groupedProducts = groupAndSortProducts(products);
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
        
        // Contenedor para los productos en este grupo
        const productContainer = document.createElement('div');
        
        products.forEach((product, index) => {
            const card = createProductCard(product, index === 0); // El primer producto es el más barato
            productContainer.appendChild(card);
        });
        
        groupDiv.appendChild(productContainer);
        container.appendChild(groupDiv);
    });
}

// Crear tarjeta de producto
function createProductCard(product, isCheapest = false) {
    const card = document.createElement('div');
    card.className = `product-card ${isCheapest ? 'cheapest' : ''}`;
    
    // Formatear precio con coma para el formato europeo
    const formattedPrice = product.price.replace('.', ',');
    
    card.innerHTML = `
        <div class="product-header">
            <div class="product-name">${product.productName}</div>
            <div class="product-price">${formattedPrice}€</div>
        </div>
        <div class="product-details">
            <div class="product-store">${product.storeName}</div>
            ${product.unit ? `<div class="product-unit">${product.unit}</div>` : ''}
        </div>
        <div class="product-date">${product.dateAdded}</div>
        <div class="actions">
            <button class="btn btn-edit" data-id="${product.id}">Editar</button>
            <button class="btn btn-delete" data-id="${product.id}">Eliminar</button>
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
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value;
        loadProducts(query);
    });
    
    // Botón para limpiar búsqueda
    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
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
    const unit = document.getElementById('unit').value.trim();
    
    // Validar que el precio tenga formato numérico europeo
    if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(price)) {
        alert('Por favor, introduce un precio válido (formato europeo con , o .)');
        return;
    }
    
    // Normalizar el precio a formato con punto (para almacenamiento interno)
    const normalizedPrice = price.replace(',', '.');
    
    const product = {
        productName: name,
        storeName: store,
        price: normalizedPrice,
        unit: unit
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
            // Mostrar precio con coma para formato europeo
            document.getElementById('price').value = product.price.replace('.', ',');
            document.getElementById('unit').value = product.unit || '';
            
            editingProductId = id;
            document.getElementById('productModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error obteniendo producto para editar:', error);
    }
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