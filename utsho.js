/* globals Tesseract */
(function () {
    'use strict';
    let worker = null;

    function createButton() {
        if (document.getElementById("german-ocr-btn")) return;
        let btn = document.createElement("button");
        btn.id = "german-ocr-btn";
        btn.innerHTML = "🔥🔥🔥 Utsho 🔥🔥🔥";
        btn.style.cssText = "position:fixed; top:10px; right:10px; z-index:99999; padding:10px 20px; background:#607D8B; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
        document.body.appendChild(btn);
        btn.addEventListener("click", runEnglishOCR);
    }

    function forceFillInput(element, value) {
        element.focus();
        let lastValue = element.value;
        element.value = value;
        let event = new Event('input', { bubbles: true });
        let tracker = element._valueTracker;
        if (tracker) tracker.setValue(lastValue);
        element.dispatchEvent(event);
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // এক্সটেনশনের জন্য পরিবর্তিত ইমেজ প্রসেসিং (fetch ব্যবহার করা হয়েছে)
    async function preprocessImage(imgElement) {
        const response = await fetch(imgElement.src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve) => {
            let img = new Image();
            img.src = url;
            img.onload = function() {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                const scaleFactor = 2;
                const padding = 10;
                canvas.width = (img.width * scaleFactor) + (padding * 2);
                canvas.height = (img.height * scaleFactor) + (padding * 2);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, padding, padding, img.width * scaleFactor, img.height * scaleFactor);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 1.0));
            };
        });
    }

    function findTargetPairs() {
        let pairs = [];
        let containers = document.querySelectorAll(".vw-imgcontainer, .field-image");
        containers.forEach(container => {
            let img = container.querySelector("img");
            if (img) {
                let mainRow = container.closest(".vf-field, .row, .form-group");
                if (mainRow) {
                    let input = mainRow.querySelector("input[type='text']");
                    if (input && (!input.value || input.value.trim() === "")) {
                        pairs.push({ img, input });
                    }
                }
            }
        });
        return pairs;
    }

    async function runEnglishOCR() {
        let btn = document.getElementById("german-ocr-btn");
        let tasks = findTargetPairs();
        if (tasks.length === 0) { alert("No empty fields found!"); return; }

        btn.innerHTML = "⏳ Starting...";
        btn.disabled = true;

        if (!worker) {
            worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng+deu');
            await worker.initialize('eng+deu');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß-. ',
                tessedit_pageseg_mode: '7',
            });
        }

        btn.innerHTML = "Reading...";
        for (let task of tasks) {
            let { img, input } = task;
            input.style.backgroundColor = "#fff9c4";
            try {
                let processedImg = await preprocessImage(img);
                const { data: { text } } = await worker.recognize(processedImg);
                let cleanText = text.replace(/[^a-zA-Z0-9ÄÖÜäöüß\-\. ]/g, '').trim();
                if (cleanText.length > 0) {
                    forceFillInput(input, cleanText);
                    input.style.backgroundColor = "#c8e6c9";
                }
            } catch (e) { console.error("OCR Error:", e); }
        }
        btn.innerHTML = "✅ Done";
        btn.disabled = false;
        setTimeout(() => { btn.innerHTML = "🇺🇸/🇩🇪 Fill Eng/Ger Text"; }, 3000);
    }

    setTimeout(createButton, 2000);
})();
