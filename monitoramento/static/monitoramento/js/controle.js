(() => {
    const app = document.getElementById("controllerApp");
    if (!app) {
        return;
    }

    const modeLabels = {
        normal: "Normal",
        calor: "Aumento de Calor",
        fadiga: "Fadiga Extrema",
        recuperacao: "Recuperacao",
    };

    const dom = {
        statusBadge: document.getElementById("controllerStatusBadge"),
        feedback: document.getElementById("controllerFeedback"),
        buttons: Array.from(app.querySelectorAll(".mode-btn")),
    };

    let activeMode = app.dataset.currentMode || "normal";

    function getCsrfToken() {
        const parts = document.cookie.split(";").map((chunk) => chunk.trim());
        for (const part of parts) {
            if (part.startsWith("csrftoken=")) {
                return decodeURIComponent(part.slice("csrftoken=".length));
            }
        }
        return "";
    }

    function renderMode(mode) {
        const safeMode = modeLabels[mode] ? mode : "normal";
        activeMode = safeMode;
        dom.statusBadge.textContent = modeLabels[safeMode];

        dom.statusBadge.classList.remove("status-safe", "status-warning", "status-risk");
        if (safeMode === "normal" || safeMode === "recuperacao") {
            dom.statusBadge.classList.add("status-safe");
        } else if (safeMode === "calor") {
            dom.statusBadge.classList.add("status-warning");
        } else {
            dom.statusBadge.classList.add("status-risk");
        }

        dom.buttons.forEach((button) => {
            button.classList.toggle("active", button.dataset.mode === safeMode);
        });
    }

    async function sendMode(mode) {
        dom.feedback.textContent = "Enviando comando para o dashboard...";

        const formData = new FormData();
        formData.append("mode", mode);

        const response = await fetch("/api/modo/definir/", {
            method: "POST",
            headers: { "X-CSRFToken": getCsrfToken() },
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Falha ao atualizar modo.");
        }

        const payload = await response.json();
        renderMode(payload.mode);
        dom.feedback.textContent = "Comando aplicado. Dashboard sincronizado.";
    }

    function bindButtons() {
        dom.buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const mode = button.dataset.mode;
                if (mode === activeMode) {
                    dom.feedback.textContent = "Esse modo ja esta ativo.";
                    return;
                }

                try {
                    await sendMode(mode);
                } catch (error) {
                    dom.feedback.textContent = "Nao foi possivel enviar. Tente novamente.";
                }
            });
        });
    }

    renderMode(activeMode);
    bindButtons();
})();
