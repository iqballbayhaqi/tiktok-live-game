(function() {
    const backBtn = document.getElementById('back-btn');
    
    function goBack() {
        // Cek apakah ada referrer (halaman sebelumnya)
        if (document.referrer && document.referrer !== window.location.href) {
            // Ada halaman sebelumnya, kembali
            window.history.back();
        } else {
            // Tidak ada referrer (direct link), redirect ke dashboard
            window.location.href = '/control-room';
        }
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            goBack();
        });
    }
})();

