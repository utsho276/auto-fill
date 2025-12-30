// ==UserScript==
// @name        Microworkers/Crowdcigar English OCR Fix (Natural Mode)
// @namespace   http://tampermonkey.net/
// @version     12.0
// @description Auto fill English names/numbers - Reads original image naturally
// @author      You
// @match       https://euprod.crowdcigar.com/*
// @require     https://unpkg.com/tesseract.js@4.0.2/dist/tesseract.min.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

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

    // React Compatible Input Filler
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

    // Processing Image (Simple Grayscale only, No Contrast manipulation)
    function preprocessImage(imgElement) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: imgElement.src,
                responseType: "blob",
                onload: function(response) {
                    let blob = response.response;
                    let url = URL.createObjectURL(blob);
                    let img = new Image();
                    img.src = url;

                    img.onload = function() {
                        let canvas = document.createElement('canvas');
                        let ctx = canvas.getContext('2d');

                        // Minimum scaling (2x) just to make dots(.) visible to computer
                        // Tesseract struggles with tiny text, so 2x is a safe balance.
                        const scaleFactor = 2;
                        const padding = 10;

                        canvas.width = (img.width * scaleFactor) + (padding * 2);
                        canvas.height = (img.height * scaleFactor) + (padding * 2);

                        // White background
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Draw natural image
                        ctx.drawImage(img, padding, padding, img.width * scaleFactor, img.height * scaleFactor);

                        URL.revokeObjectURL(url);

                        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        let data = imageData.data;

                        // Simple Grayscale Conversion (Keeps light gray text visible)
                        for (let i = 0; i < data.length; i += 4) {
                            let gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;

                            // NO THRESHOLDING / NO HIGH CONTRAST
                            // Just setting r, g, b to the gray value.
                            // If text is light gray (e.g. 200), it stays 200 (readable).

                            data[i] = gray;
                            data[i + 1] = gray;
                            data[i + 2] = gray;
                        }
                        ctx.putImageData(imageData, 0, 0);

                        resolve(canvas.toDataURL('image/jpeg', 1.0));
                    };
                },
                onerror: function(err) {
                    console.error("CORS Error:", err);
                    reject(err);
                }
            });
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

        if (tasks.length === 0) {
            alert("No empty fields found!");
            return;
        }

        btn.innerHTML = "⏳ Starting...";
        btn.disabled = true;

        if (!worker) {
            worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng+deu');
            await worker.initialize('eng+deu');

            // Parameters optimization for natural reading
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß-. ',
                tessedit_pageseg_mode: '7', // Single line mode
            });
        }

        btn.innerHTML = "Reading...";

        for (let task of tasks) {
            let { img, input } = task;
            input.style.backgroundColor = "#fff9c4";

            try {
                let processedImg = await preprocessImage(img);

                // Added "LSTM_ONLY" engine mode logic implicitly by defaults
                const { data: { text, confidence } } = await worker.recognize(processedImg);

                // Keep dots, dashes, and numbers
                let cleanText = text.replace(/[^a-zA-Z0-9ÄÖÜäöüß\-\. ]/g, '').trim();

                console.log(`Original Read: "${cleanText}" (Conf: ${confidence})`);

                if (cleanText.length > 0) {
                    forceFillInput(input, cleanText);
                    input.style.backgroundColor = "#c8e6c9";
                } else {
                    input.style.backgroundColor = "#ffcdd2";
                }

            } catch (e) {
                console.error("OCR Error:", e);
                input.style.backgroundColor = "#ffcdd2";
            }
            await new Promise(r => setTimeout(r, 50));
        }

        btn.innerHTML = "✅ Done";
        btn.disabled = false;
        setTimeout(() => { btn.innerHTML = "🇺🇸/🇩🇪 Fill Eng/Ger Text"; }, 3000);
    }

    setTimeout(createButton, 2000);
    setTimeout(createButton, 5000);
})();
