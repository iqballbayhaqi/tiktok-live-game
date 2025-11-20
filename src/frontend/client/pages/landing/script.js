// Dapatkan nomor WhatsApp dan pesan dari config atau gunakan default
// Bisa diubah melalui query parameter
const urlParams = new URLSearchParams(window.location.search);
let whatsappNumber = urlParams.get('wa');
let whatsappMessage = urlParams.get('msg');

// Coba load dari config jika tidak ada di query parameter
if (!whatsappNumber || !whatsappMessage) {
    fetch('/config/config.json')
        .then(response => response.json())
        .then(config => {
            if (!whatsappNumber) {
                whatsappNumber = config.whatsappNumber || config.whatsapp?.number || '6281234567890';
            }
            if (!whatsappMessage) {
                whatsappMessage = config.whatsapp?.message || 'Halo, saya ingin mendaftarkan live streaming saya';
            }
            updateWhatsAppLink();
        })
        .catch(() => {
            if (!whatsappNumber) {
                whatsappNumber = '6281234567890';
            }
            if (!whatsappMessage) {
                whatsappMessage = 'Halo, saya ingin mendaftarkan live streaming saya';
            }
            updateWhatsAppLink();
        });
} else {
    updateWhatsAppLink();
}

function updateWhatsAppLink() {
    const whatsappLink = document.getElementById('whatsapp-link');
    if (whatsappLink) {
        whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    }
}

