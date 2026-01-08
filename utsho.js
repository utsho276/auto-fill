    function createButton() {
        if (document.getElementById("german-ocr-btn")) return;
        let btn = document.createElement("button");
        btn.id = "german-ocr-btn";
        btn.innerHTML = "🔥🔥🔥 Utsho 🔥🔥🔥";
        btn.style.cssText = "position:fixed; top:10px; right:10px; z-index:99999; padding:10px 20px; background:#607D8B; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
        document.body.appendChild(btn);
        btn.addEventListener("click", runEnglishOCR);
