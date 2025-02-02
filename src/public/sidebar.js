// Slideshow functionality
function initializeSlideshow(selector, interval = 5000) {
    const slides = document.querySelectorAll(selector + ' .slide');
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    // Change slides at the specified interval
    setInterval(nextSlide, interval);
}

function initializeSlideshows() {
    // Initialize main slideshow with 5s interval
    initializeSlideshow('.slideshow:not(.qr-slideshow)', 20000);
    // Initialize QR slideshow with faster 3s rotation for better engagement
    initializeSlideshow('.qr-slideshow', 15000);
}

// Generate QR Code for WiFi network
function generateQRCode() {
    const wifiDetails = {
        ssid: "DataPrivacyDemo",
        password: "ShowMeMyData2024",
        encryption: "WPA"
    };
    
    // Format WiFi network details according to standard format
    const wifiString = `WIFI:T:${wifiDetails.encryption};S:${wifiDetails.ssid};P:${wifiDetails.password};;`;
    
    // Generate QR code
    QRCode.toCanvas(document.getElementById('qrcode'), wifiString, {
        width: 200,
        height: 200,
        margin: 1,
        color: {
            dark: '#ffffff',  // White QR code for better visibility
            light: '#00000000' // Transparent background
        }
    }, function(error) {
        if (error) console.error(error);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSlideshows();
    generateQRCode();
});
