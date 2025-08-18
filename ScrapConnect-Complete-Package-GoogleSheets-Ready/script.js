// ScrapConnect - Complete with Google Sheets Integration

// Global app state
let appState = {
    currentUser: null,
    currentScreen: 'landing-screen',
    selectedCategory: null,
    selectedRole: null,
    uploadedPhotos: [],
    listings: [],
    isLoggedIn: false,
    userLocation: null
};

// API Configuration - REPLACE WITH YOUR GOOGLE APPS SCRIPT URL
const API_CONFIG = {
    BASE_URL: 'https://script.google.com/macros/s/AKfycbyTLMUuz4puFeGLtfP__3VZ8pGEgn_ItAbSxOtCk48aCxjfmKo5MySSL5aYgBrVcldo/exec',
    TIMEOUT: 30000
};

// Sample data for demo when backend is not available
const sampleListings = [
    {
        id: 'DEMO001',
        category: 'Paper',
        customerName: 'Raj Kumar',
        customerPhone: '+91-9876543210',
        quantity: '50',
        unit: 'kg',
        description: 'Old newspapers and magazines',
        address: 'MG Road, Sector 14, Gurgaon, Haryana',
        estimatedPrice: '₹150-200',
        status: 'available',
        postedDate: '2025-08-17',
        photos: [],
        lat: 28.4595,
        lng: 77.0266
    },
    {
        id: 'DEMO002',
        category: 'Electronics',
        customerName: 'Priya Sharma',
        customerPhone: '+91-8765432109',
        quantity: '5',
        unit: 'pieces',
        description: 'Old mobile phones and chargers',
        address: 'DLF Phase 2, Gurgaon, Haryana',
        estimatedPrice: '₹750-1000',
        status: 'available',
        postedDate: '2025-08-16',
        photos: [],
        lat: 28.4743,
        lng: 77.1017
    }
];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('ScrapConnect App Initialized');
    loadUserFromStorage();
    updateUI();
});

// ==================== API METHODS ====================

async function apiCall(endpoint, method = 'GET', data = null) {
    showLoading(true);

    try {
        const options = {
            method: method,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
        }

        let url = API_CONFIG.BASE_URL;

        // Check if URL is configured
        if (url.includes('REPLACE_WITH_YOUR')) {
            throw new Error('API URL not configured');
        }

        if (method === 'GET' && data) {
            const params = new URLSearchParams(data);
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'API call failed');
        }

        return result.data;

    } catch (error) {
        console.error('API call failed:', error);
        showToast('Connection issue. Using local data for now.', 'warning');
        return null;
    } finally {
        showLoading(false);
    }
}

async function createUser(userData) {
    const result = await apiCall('', 'POST', {
        action: 'createUser',
        ...userData
    });

    if (result) {
        showToast('Account created and saved to Google Sheets!', 'success');
        return result;
    }

    // Fallback to local storage
    return {
        user: {
            phone: userData.phone,
            role: userData.role,
            name: userData.name,
            isVerified: true
        }
    };
}

async function createListing(listingData) {
    const result = await apiCall('', 'POST', {
        action: 'createListing',
        ...listingData
    });

    if (result) {
        showToast('Listing saved to Google Sheets!', 'success');
        return result;
    }

    // Fallback to local storage
    const newListing = {
        id: 'LOCAL' + Date.now(),
        ...listingData,
        status: 'available',
        postedDate: new Date().toISOString().split('T')[0]
    };

    appState.listings.push(newListing);
    saveUserToStorage();
    showToast('Listing saved locally (backup mode)', 'info');

    return { listing: newListing };
}

async function getListings(filters = {}) {
    const result = await apiCall('', 'GET', {
        action: 'listings',
        ...filters
    });

    if (result && result.length > 0) {
        return result;
    }

    // Fallback to sample + local data
    const allListings = [...sampleListings, ...appState.listings];
    return allListings.filter(listing => {
        if (filters.customerPhone && listing.customerPhone !== filters.customerPhone) return false;
        if (filters.status && listing.status !== filters.status) return false;
        if (filters.category && listing.category !== filters.category) return false;
        return true;
    });
}

// ==================== ROLE SELECTION ====================

function selectRole(element, role) {
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');
    appState.selectedRole = role;

    setTimeout(() => {
        showScreen('phone-screen');
    }, 500);
}

// ==================== NAVIGATION ====================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    document.getElementById(screenId).classList.add('active');
    appState.currentScreen = screenId;

    console.log('Navigated to:', screenId);
}

function goBack() {
    if (appState.currentScreen === 'phone-screen') {
        showScreen('landing-screen');
    }
}

// ==================== USER REGISTRATION ====================

async function registerUser() {
    const phoneInput = document.getElementById('phone-input');
    const phone = phoneInput.value.trim();

    if (!phone || phone.length < 10) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }

    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
        const userData = {
            phone: '+91-' + phone,
            role: appState.selectedRole,
            name: appState.selectedRole === 'customer' ? 'Customer User' : 'Dealer User',
            location: appState.userLocation || { lat: 28.4595, lng: 77.0266 }
        };

        const result = await createUser(userData);

        appState.currentUser = result.user;
        appState.currentUser.phone = '+91-' + phone;
        appState.currentUser.role = appState.selectedRole;
        appState.currentUser.isVerified = true;
        appState.isLoggedIn = true;

        saveUserToStorage();

        showScreen('main-screen');
        setupMainApp();

    } catch (error) {
        console.error('Registration failed:', error);
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// ==================== MAIN APP SETUP ====================

function setupMainApp() {
    document.getElementById('user-name').textContent = appState.currentUser.name;
    document.getElementById('user-role').textContent = appState.currentUser.role.charAt(0).toUpperCase() + appState.currentUser.role.slice(1);

    if (appState.currentUser.role === 'customer') {
        switchTab('home');
        updateCustomerUI();
    } else {
        switchTab('dashboard');
        updateDealerUI();
        loadDealerDashboard();
    }

    document.getElementById('profile-name').textContent = appState.currentUser.name;
    document.getElementById('profile-phone').textContent = appState.currentUser.phone;
    document.getElementById('profile-role-text').textContent = appState.currentUser.role.charAt(0).toUpperCase() + appState.currentUser.role.slice(1) + ' Account';

    updateStats();
}

function updateCustomerUI() {
    document.getElementById('nav-home').style.display = 'flex';
    document.getElementById('nav-home-text').textContent = 'Home';

    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab) {
        dashboardTab.style.display = 'none';
    }
}

function updateDealerUI() {
    document.getElementById('nav-home').style.display = 'flex';
    document.getElementById('nav-home-text').textContent = 'Dashboard';
    document.getElementById('history-title').textContent = 'Collection History';

    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab) {
        dashboardTab.style.display = 'block';
    }

    const homeTab = document.getElementById('home-tab');
    if (homeTab) {
        homeTab.style.display = 'none';
    }
}

async function loadDealerDashboard() {
    try {
        const allListings = await getListings({ status: 'available' });
        const collections = appState.listings.filter(l => l.status === 'completed');

        document.getElementById('total-collections').textContent = collections.length;
        document.getElementById('monthly-revenue').textContent = '₹' + (collections.length * 1500);
        document.getElementById('pending-pickups').textContent = allListings.length;

        loadRecentActivity(allListings);

    } catch (error) {
        console.error('Failed to load dealer dashboard:', error);
    }
}

function loadRecentActivity(listings) {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    const recentListings = listings.slice(0, 5);

    if (recentListings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    const activityHTML = recentListings.map(listing => `
        <div class="activity-item">
            <div class="activity-icon">${getCategoryIcon(listing.category)}</div>
            <div class="activity-content">
                <h4>${listing.category} - ${listing.quantity} ${listing.unit}</h4>
                <p>${listing.customerName} • ${listing.address}</p>
                <small>${listing.postedDate}</small>
            </div>
            <div class="activity-actions">
                <button class="btn-small" onclick="contactCustomer('${listing.customerPhone}')">Contact</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = activityHTML;
}

function getCategoryIcon(category) {
    const icons = {
        'Paper': '📄',
        'Plastic': '🥤',
        'Metal': '🔩',
        'Electronics': '📱',
        'Glass': '🍾',
        'Cardboard': '📦'
    };
    return icons[category] || '📦';
}

// ==================== TAB SWITCHING ====================

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    let targetTab = tabName + '-tab';

    if (tabName === 'home' && appState.currentUser && appState.currentUser.role === 'dealer') {
        targetTab = 'dashboard-tab';
    }

    const navItem = document.querySelector(`[onclick*="${tabName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    const tabPane = document.getElementById(targetTab);
    if (tabPane) {
        tabPane.classList.add('active');
    }

    if (tabName === 'marketplace') {
        loadMarketplaceListings();
    } else if (tabName === 'history') {
        loadUserHistory();
    } else if (tabName === 'home' && appState.currentUser && appState.currentUser.role === 'dealer') {
        loadDealerDashboard();
    }
}

// ==================== LOCATION SERVICES ====================

async function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                appState.userLocation = { lat, lng };

                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                window.open(mapsUrl, '_blank');

                showToast('Location found and opened in Google Maps!', 'success');

                const addressInput = document.getElementById('address-input');
                if (addressInput) {
                    reverseGeocode(lat, lng).then(address => {
                        if (address) {
                            addressInput.value = address;
                        }
                    });
                }
            },
            function(error) {
                console.error('Geolocation error:', error);
                showToast('Could not get location. Please enter address manually.', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    } else {
        showToast('Geolocation not supported by this browser', 'error');
    }
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        const data = await response.json();

        if (data && data.display_name) {
            return data.display_name;
        }

        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}

function showCurrentLocation() {
    getCurrentLocation();
}

function openFullMap() {
    if (appState.userLocation) {
        const mapsUrl = `https://www.google.com/maps?q=${appState.userLocation.lat},${appState.userLocation.lng}`;
        window.open(mapsUrl, '_blank');
    } else {
        const mapsUrl = 'https://www.google.com/maps/search/scrap+dealers+near+me';
        window.open(mapsUrl, '_blank');
    }
    showToast('Opening Google Maps...', 'info');
}

// ==================== LISTING MANAGEMENT ====================

function selectCategory(element, category) {
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');
    appState.selectedCategory = category;

    showToast(`${category} category selected`, 'info');
}

function handlePhotoUpload(input) {
    const files = Array.from(input.files);

    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                appState.uploadedPhotos.push({
                    id: Date.now() + Math.random(),
                    url: e.target.result,
                    name: file.name
                });
                updatePhotoPreview();
            };
            reader.readAsDataURL(file);
        }
    });

    input.value = '';
}

function updatePhotoPreview() {
    const previewContainer = document.getElementById('photo-preview');

    if (appState.uploadedPhotos.length === 0) {
        previewContainer.innerHTML = '';
        return;
    }

    const photosHTML = appState.uploadedPhotos.map((photo, index) => `
        <div class="photo-item">
            <img src="${photo.url}" alt="${photo.name}">
            <button class="photo-remove" onclick="removePhoto(${index})">×</button>
        </div>
    `).join('');

    previewContainer.innerHTML = photosHTML;
}

function removePhoto(index) {
    appState.uploadedPhotos.splice(index, 1);
    updatePhotoPreview();
    showToast('Photo removed', 'info');
}

async function createListing() {
    const quantityInput = document.getElementById('quantity-input');
    const unitSelect = document.getElementById('unit-select');
    const descriptionInput = document.getElementById('description-input');
    const addressInput = document.getElementById('address-input');

    if (!appState.selectedCategory) {
        showToast('Please select a category', 'error');
        return;
    }

    if (!quantityInput.value || quantityInput.value <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }

    if (!addressInput.value.trim()) {
        showToast('Please enter your address', 'error');
        return;
    }

    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
        const newListing = {
            customerName: appState.currentUser.name,
            customerPhone: appState.currentUser.phone,
            category: appState.selectedCategory,
            quantity: quantityInput.value,
            unit: unitSelect.value,
            description: descriptionInput.value || 'No description provided',
            address: addressInput.value,
            imageUrls: appState.uploadedPhotos.map(p => p.url),
            lat: appState.userLocation?.lat || 28.4595,
            lng: appState.userLocation?.lng || 77.0266,
            estimatedPrice: calculatePrice(appState.selectedCategory, quantityInput.value)
        };

        const result = await createListing(newListing);

        quantityInput.value = '';
        descriptionInput.value = '';
        addressInput.value = '';
        appState.selectedCategory = null;
        appState.uploadedPhotos = [];

        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('selected');
        });
        updatePhotoPreview();

        switchTab('history');

    } catch (error) {
        console.error('Failed to create listing:', error);
        showToast('Failed to create listing. Please try again.', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function calculatePrice(category, quantity) {
    const basePrices = {
        'Paper': 3,
        'Plastic': 12,
        'Metal': 45,
        'Electronics': 150,
        'Glass': 2,
        'Cardboard': 4
    };

    const basePrice = basePrices[category] || 5;
    const qty = parseFloat(quantity) || 0;
    const estimatedValue = basePrice * qty;

    const minPrice = Math.round(estimatedValue * 0.8);
    const maxPrice = Math.round(estimatedValue * 1.2);

    return `₹${minPrice}-${maxPrice}`;
}

// ==================== MARKETPLACE ====================

async function loadMarketplaceListings() {
    const container = document.getElementById('listings-container');
    const allListings = await getListings({ status: 'available' });

    if (allListings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>No Listings Available</h3>
                <p>No scrap items are currently available in your area.</p>
                <button class="btn-primary" onclick="getCurrentLocation()">Find Nearby Items</button>
            </div>
        `;
        return;
    }

    const listingsHTML = allListings.map(listing => `
        <div class="listing-card">
            <div class="listing-header">
                <div class="listing-title">${listing.category}</div>
                <div class="listing-price">${listing.estimatedPrice}</div>
            </div>
            <div class="listing-details">
                <p><strong>Quantity:</strong> ${listing.quantity} ${listing.unit}</p>
                <p><strong>Location:</strong> ${listing.address}</p>
                <p><strong>Description:</strong> ${listing.description}</p>
                <p><strong>Customer:</strong> ${listing.customerName}</p>
                <p><strong>Posted:</strong> ${listing.postedDate}</p>
            </div>
            <div class="listing-actions">
                <button class="contact-btn" onclick="contactCustomer('${listing.customerPhone}')">
                    📞 Contact Customer
                </button>
                <button class="directions-btn" onclick="getDirections('${listing.address}', ${listing.lat}, ${listing.lng})">
                    🗺️ Get Directions
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = listingsHTML;
}

function contactCustomer(phone) {
    window.open(`tel:${phone}`, '_self');
    showToast(`Calling ${phone}...`, 'info');
}

function getDirections(address, lat, lng) {
    let mapsUrl;

    if (lat && lng) {
        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }

    window.open(mapsUrl, '_blank');
    showToast('Opening directions in Google Maps...', 'info');
}

function filterListings() {
    const categoryFilter = document.getElementById('category-filter').value;
    const distanceFilter = document.getElementById('distance-filter').value;

    showToast(`Filtering: ${categoryFilter || 'All'} categories, ${distanceFilter || 'All'} distances`, 'info');
    loadMarketplaceListings();
}

// ==================== HISTORY ====================

async function loadUserHistory() {
    const container = document.getElementById('history-container');
    let userListings;

    if (appState.currentUser.role === 'customer') {
        userListings = await getListings({ customerPhone: appState.currentUser.phone });
    } else {
        userListings = await getListings({ status: 'completed' });
    }

    if (userListings.length === 0) {
        const emptyMessage = appState.currentUser.role === 'customer' 
            ? 'You haven\'t created any scrap listings yet.'
            : 'No collection history available yet.';

        const actionButton = appState.currentUser.role === 'customer'
            ? '<button class="btn-primary" onclick="switchTab(\'home\')">Create First Listing</button>'
            : '<button class="btn-primary" onclick="switchTab(\'marketplace\')">Browse Marketplace</button>';

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No History Yet</h3>
                <p>${emptyMessage}</p>
                ${actionButton}
            </div>
        `;
        return;
    }

    const historyHTML = userListings.map(listing => `
        <div class="history-item">
            <div class="history-header">
                <div class="history-title">${listing.category} - ${listing.quantity} ${listing.unit}</div>
                <div class="history-date">${listing.postedDate}</div>
            </div>
            <p>${listing.description}</p>
            <p><strong>Address:</strong> ${listing.address}</p>
            <p><strong>Estimated Price:</strong> ${listing.estimatedPrice}</p>
            <div class="history-status status-${listing.status}">${listing.status.toUpperCase()}</div>
            ${appState.currentUser.role === 'dealer' ? `
                <div class="dealer-actions">
                    <button class="btn-small" onclick="contactCustomer('${listing.customerPhone}')">Contact</button>
                    <button class="btn-small" onclick="getDirections('${listing.address}', ${listing.lat}, ${listing.lng})">Directions</button>
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = historyHTML;
}

function filterByStatus(status) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    event.target.classList.add('active');

    showToast(`Showing ${status} listings`, 'info');
    loadUserHistory();
}

// ==================== PROFILE & MENU ====================

function updateStats() {
    const totalListings = appState.listings.filter(l => l.customerPhone === appState.currentUser.phone).length;
    const completedDeals = appState.listings.filter(l => l.customerPhone === appState.currentUser.phone && l.status === 'completed').length;

    document.getElementById('profile-total-listings').textContent = totalListings;
    document.getElementById('profile-completed-deals').textContent = completedDeals;
    document.getElementById('profile-total-earnings').textContent = '₹' + (completedDeals * 500);
}

function showNotifications() {
    showToast('You have no new notifications', 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        appState = {
            currentUser: null,
            currentScreen: 'landing-screen',
            selectedCategory: null,
            selectedRole: null,
            uploadedPhotos: [],
            listings: appState.listings,
            isLoggedIn: false,
            userLocation: null
        };

        localStorage.removeItem('scrapconnect_user');
        showScreen('landing-screen');
        showToast('Logged out successfully', 'success');
    }
}

// ==================== STORAGE ====================

function saveUserToStorage() {
    try {
        const dataToSave = {
            currentUser: appState.currentUser,
            listings: appState.listings,
            isLoggedIn: appState.isLoggedIn,
            userLocation: appState.userLocation
        };
        localStorage.setItem('scrapconnect_user', JSON.stringify(dataToSave));
    } catch (error) {
        console.warn('Failed to save to storage:', error);
    }
}

function loadUserFromStorage() {
    try {
        const savedData = localStorage.getItem('scrapconnect_user');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.isLoggedIn && data.currentUser) {
                appState.currentUser = data.currentUser;
                appState.listings = data.listings || [];
                appState.isLoggedIn = true;
                appState.userLocation = data.userLocation;

                showScreen('main-screen');
                setupMainApp();
            }
        }
    } catch (error) {
        console.warn('Failed to load from storage:', error);
    }
}

// ==================== UI UTILITIES ====================

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `${icon} ${message}`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function updateUI() {
    if (appState.isLoggedIn && appState.currentUser) {
        showScreen('main-screen');
        setupMainApp();
    } else {
        showScreen('landing-screen');
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('ScrapConnect App Ready!');

    const phoneInput = document.getElementById('phone-input');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');

            if (e.target.value.length > 10) {
                e.target.value = e.target.value.slice(0, 10);
            }
        });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                appState.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('User location acquired');
            },
            function(error) {
                console.log('Location not available:', error.message);
            },
            { timeout: 5000 }
        );
    }
});

console.log('ScrapConnect with Google Sheets integration loaded successfully!');