(() => {
    const MAX_POINTS = 16;
    const UPDATE_INTERVAL_MS = 2500;
    const REMOTE_SYNC_INTERVAL_MS = 1800;
    const STEP_MINUTES = 4;

    const modeProfiles = {
        normal: { bpm: 82, temp: 36.7, heat: 29.5, fatigue: 34, exposureTrend: 1.2 },
        calor: { bpm: 103, temp: 37.8, heat: 35.2, fatigue: 58, exposureTrend: 2.1 },
        fadiga: { bpm: 118, temp: 38.2, heat: 33.1, fatigue: 84, exposureTrend: 2.6 },
        recuperacao: { bpm: 76, temp: 36.5, heat: 27.5, fatigue: 22, exposureTrend: -2.4 },
    };

    const dom = {
        body: document.body,
        statusBadge: document.getElementById("statusBadge"),
        statusDescription: document.getElementById("statusDescription"),
        bpmValue: document.getElementById("bpmValue"),
        tempValue: document.getElementById("tempValue"),
        heatValue: document.getElementById("heatValue"),
        exposureValue: document.getElementById("exposureValue"),
        fatigueValue: document.getElementById("fatigueValue"),
        riskLabel: document.getElementById("riskLabel"),
        riskScore: document.getElementById("riskScore"),
        riskFill: document.getElementById("riskFill"),
        alertsContainer: document.getElementById("alertsContainer"),
        remoteModeLabel: document.getElementById("remoteModeLabel"),
    };

    const state = {
        bpm: 82,
        temp: 36.7,
        heat: 29.4,
        exposure: 48,
        fatigue: 36,
        riskScore: 24,
        mode: "normal",
        labels: [],
        bpmSeries: [],
        tempSeries: [],
        riskSeries: [],
        tick: 0,
        lastRemoteUpdate: "",
    };

    let bpmChart;
    let tempChart;
    let riskChart;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const drift = (current, target, spread) => current + (target - current) * 0.3 + ((Math.random() * 2 - 1) * spread);
    const modeLabel = (mode) => {
        if (mode === "calor") return "Aumento de Calor";
        if (mode === "fadiga") return "Fadiga Extrema";
        if (mode === "recuperacao") return "Recuperacao";
        return "Normal";
    };

    function setupCharts() {
        const common = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 350 },
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: { ticks: { color: "#4f675d", maxTicksLimit: 6 } },
                y: { ticks: { color: "#4f675d" } },
            },
        };

        bpmChart = new Chart(document.getElementById("bpmChart"), {
            type: "line",
            data: { labels: state.labels, datasets: [{ data: state.bpmSeries, borderColor: "#198754", backgroundColor: "rgba(25,135,84,0.12)", fill: true, tension: 0.35 }] },
            options: { ...common, scales: { ...common.scales, y: { ...common.scales.y, min: 60, max: 150 } } },
        });

        tempChart = new Chart(document.getElementById("tempChart"), {
            type: "line",
            data: { labels: state.labels, datasets: [{ data: state.tempSeries, borderColor: "#0f6ab4", backgroundColor: "rgba(15,106,180,0.12)", fill: true, tension: 0.35 }] },
            options: { ...common, scales: { ...common.scales, y: { ...common.scales.y, min: 35.5, max: 39.5 } } },
        });

        riskChart = new Chart(document.getElementById("riskChart"), {
            type: "line",
            data: { labels: state.labels, datasets: [{ data: state.riskSeries, borderColor: "#c92a2a", backgroundColor: "rgba(201,42,42,0.12)", fill: true, tension: 0.35 }] },
            options: { ...common, scales: { ...common.scales, y: { ...common.scales.y, min: 0, max: 100 } } },
        });
    }

    function computeRisk() {
        let score = 0;
        let criticalCount = 0;
        const alerts = [];

        if (state.bpm > 110) {
            score += 22;
            criticalCount += 1;
            alerts.push("Frequencia cardiaca elevada para atividade atual.");
        } else if (state.bpm > 100) {
            score += 10;
        }

        if (state.temp > 37.8) {
            score += 25;
            criticalCount += 1;
            alerts.push("Risco de exaustao termica detectado.");
        } else if (state.temp > 37.3) {
            score += 12;
        }

        if (state.heat > 32) {
            score += 20;
            criticalCount += 1;
            alerts.push("Indice de calor elevado no ambiente.");
        } else if (state.heat > 29.5) {
            score += 10;
        }

        if (state.exposure > 90) {
            score += 15;
            criticalCount += 1;
            alerts.push("Tempo de exposicao ao sol acima do ideal.");
        } else if (state.exposure > 70) {
            score += 8;
        }

        if (state.fatigue > 70) {
            score += 25;
            criticalCount += 1;
            alerts.push("Fadiga extrema com impacto no desempenho fisico.");
        } else if (state.fatigue > 50) {
            score += 12;
        }

        if (criticalCount >= 3) {
            score += 15;
        }

        score = clamp(Math.round(score), 0, 100);

        let status = "safe";
        let label = "Seguro";
        let description = "Condicoes estaveis para continuidade do trabalho.";
        let riskLabel = "Baixo";

        if (score >= 70 || criticalCount >= 3) {
            status = "risk";
            label = "Risco";
            riskLabel = "Alto";
            description = "Acao imediata recomendada para evitar evento ocupacional.";
            alerts.unshift("Recomendar pausa imediata.");
            alerts.push("Orientar hidratacao.");
            alerts.push("Reduzir exposicao direta ao sol.");
            alerts.push("Verificar condicao fisica do trabalhador.");
        } else if (score >= 40 || criticalCount >= 1) {
            status = "warning";
            label = "Atencao";
            riskLabel = "Moderado";
            description = "Indicadores em elevacao; monitoramento reforcado necessario.";
            alerts.unshift("Sinais de sobrecarga em desenvolvimento.");
            alerts.push("Orientar hidratacao preventiva.");
        }

        if (alerts.length === 0) {
            alerts.push("Monitoramento ativo sem desvios criticos.");
        }

        return { score, status, label, description, riskLabel, alerts };
    }

    function applyTheme(status) {
        dom.statusBadge.classList.remove("status-safe", "status-warning", "status-risk");
        dom.body.classList.remove("risk-safe", "risk-warning", "risk-danger");

        if (status === "risk") {
            dom.statusBadge.classList.add("status-risk");
            dom.body.classList.add("risk-danger");
            dom.riskFill.style.background = "linear-gradient(90deg, #ef5350, #c92a2a)";
        } else if (status === "warning") {
            dom.statusBadge.classList.add("status-warning");
            dom.body.classList.add("risk-warning");
            dom.riskFill.style.background = "linear-gradient(90deg, #f2b94c, #e67e22)";
        } else {
            dom.statusBadge.classList.add("status-safe");
            dom.body.classList.add("risk-safe");
            dom.riskFill.style.background = "linear-gradient(90deg, #3fbf78, #198754)";
        }
    }

    function renderAlerts(alerts, status) {
        dom.alertsContainer.innerHTML = "";

        alerts.slice(0, 5).forEach((alertText) => {
            const item = document.createElement("div");
            item.classList.add("alert-item");
            item.classList.add(status === "risk" ? "alert-risk" : status === "warning" ? "alert-warning" : "alert-safe");
            item.textContent = alertText;
            dom.alertsContainer.appendChild(item);
        });
    }

    function pushSeries(riskResult) {
        state.tick += 1;
        const label = `${state.tick * STEP_MINUTES}m`;

        state.labels.push(label);
        state.bpmSeries.push(Number(state.bpm.toFixed(0)));
        state.tempSeries.push(Number(state.temp.toFixed(1)));
        state.riskSeries.push(riskResult.score);

        if (state.labels.length > MAX_POINTS) {
            state.labels.shift();
            state.bpmSeries.shift();
            state.tempSeries.shift();
            state.riskSeries.shift();
        }
    }

    function render(riskResult) {
        dom.bpmValue.textContent = state.bpm.toFixed(0);
        dom.tempValue.textContent = state.temp.toFixed(1);
        dom.heatValue.textContent = state.heat.toFixed(1);
        dom.exposureValue.textContent = state.exposure.toFixed(0);
        dom.fatigueValue.textContent = state.fatigue.toFixed(0);
        dom.riskScore.textContent = riskResult.score;
        dom.riskLabel.textContent = riskResult.riskLabel;
        dom.statusBadge.textContent = riskResult.label;
        dom.statusDescription.textContent = riskResult.description;
        dom.riskFill.style.width = `${riskResult.score}%`;

        applyTheme(riskResult.status);
        renderAlerts(riskResult.alerts, riskResult.status);

        bpmChart.update("none");
        tempChart.update("none");
        riskChart.update("none");
    }

    function updateSimulation() {
        const profile = modeProfiles[state.mode];
        state.bpm = clamp(drift(state.bpm, profile.bpm, 4), 62, 146);
        state.temp = clamp(drift(state.temp, profile.temp, 0.08), 35.9, 39.4);
        state.heat = clamp(drift(state.heat, profile.heat, 0.35), 24, 41);
        state.fatigue = clamp(drift(state.fatigue, profile.fatigue, 2.8), 8, 98);
        state.exposure = clamp(state.exposure + profile.exposureTrend + (Math.random() * 0.8), 0, 240);

        const riskResult = computeRisk();
        state.riskScore = riskResult.score;
        pushSeries(riskResult);
        render(riskResult);
    }

    function setMode(mode) {
        if (!modeProfiles[mode]) {
            return;
        }

        state.mode = mode;
        if (dom.remoteModeLabel) {
            dom.remoteModeLabel.textContent = modeLabel(mode);
        }

        if (mode === "calor") {
            state.heat = clamp(state.heat + 2, 24, 41);
            state.temp = clamp(state.temp + 0.2, 35.9, 39.4);
        } else if (mode === "fadiga") {
            state.fatigue = clamp(state.fatigue + 10, 8, 98);
            state.bpm = clamp(state.bpm + 6, 62, 146);
        } else if (mode === "recuperacao") {
            state.exposure = clamp(state.exposure - 15, 0, 240);
        }

        updateSimulation();
    }

    async function syncRemoteMode() {
        try {
            const response = await fetch("/api/modo/", { cache: "no-store" });
            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            if (!modeProfiles[payload.mode]) {
                return;
            }

            if (payload.updated_at !== state.lastRemoteUpdate) {
                state.lastRemoteUpdate = payload.updated_at;
                if (payload.mode !== state.mode) {
                    setMode(payload.mode);
                } else if (dom.remoteModeLabel) {
                    dom.remoteModeLabel.textContent = modeLabel(payload.mode);
                }
            }
        } catch (_error) {
            // Em demo offline, segue simulacao local sem bloquear o dashboard.
        }
    }

    function boot() {
        setupCharts();

        for (let i = 0; i < MAX_POINTS - 4; i += 1) {
            updateSimulation();
        }

        window.setInterval(updateSimulation, UPDATE_INTERVAL_MS);
        window.setInterval(syncRemoteMode, REMOTE_SYNC_INTERVAL_MS);
        syncRemoteMode();
    }

    boot();
})();
