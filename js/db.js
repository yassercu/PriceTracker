// db.js - Gestión de IndexedDB para PriceTracker

const DB_NAME = 'PriceTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

// Variable para almacenar la conexión a la base de datos
let db;

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
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Crear el almacén de objetos
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Crear índices para búsquedas eficientes
                objectStore.createIndex('productName', 'productName', { unique: false });
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
        const productWithDate = {
            ...product,
            dateAdded: new Date().toLocaleDateString('es-ES')
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
            const updatedProductWithDate = {
                ...updatedProduct,
                id: product.id,
                dateAdded: product.dateAdded
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
        const index = store.index('productName');
        const request = index.getAll();
        
        request.onsuccess = () => {
            const products = request.result;
            const filteredProducts = products.filter(product => 
                product.productName.toLowerCase().includes(query.toLowerCase())
            );
            resolve(filteredProducts);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Agrupar productos por nombre
function groupProductsByName(products) {
    const grouped = {};
    products.forEach(product => {
        const name = product.productName;
        if (!grouped[name]) {
            grouped[name] = [];
        }
        grouped[name].push(product);
    });
    return grouped;
}

// Agrupar y ordenar productos por precio
function groupAndSortProducts(products) {
    const grouped = groupProductsByName(products);
    
    Object.keys(grouped).forEach(name => {
        // Ordenar por precio de menor a mayor
        grouped[name].sort((a, b) => {
            // Convertir precios a números, considerando formato europeo
            const priceA = parseFloat(a.price.replace(',', '.'));
            const priceB = parseFloat(b.price.replace(',', '.'));
            return priceA - priceB;
        });
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