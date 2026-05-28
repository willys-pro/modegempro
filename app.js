/**
 * Advanced Deriv Trade Automation Engine with Active Charting & Position Tracking
 */

class AdvancedDerivBot {
    constructor() {
        this.ws = null;
        this.appId = '1089';
        this.token = '';
        this.prices = []; 
        this.maValues = []; // Mirror structure to plot alongside close prices
        this.maxDataPoints = 35; 
        this.isAuthorized = false;
        this.currentProposalId = null;
        this.chart = null;

        // UI Target bindings
        this.dom = {
            connectBtn: document.getElementById('btn-connect'),
            tradeBtn: document.getElementById('btn-manual-trade'),
            appIdInput: document.getElementById('app-id'),
            tokenInput: document.getElementById('api-token'),
            marketSelect: document.getElementById('market'),
            tradeTypeSelect: document.getElementById('trade-type'),
            barrierInput: document.getElementById('barrier-offset'),
            stakeInput: document.getElementById('stake'),
            statusBadge: document.getElementById('connection-status'),
            spotDisplay: document.getElementById('current-spot'),
            payoutDisplay: document.getElementById('proposal-payout'),
            balanceDisplay: document.getElementById('account-balance'),
            outcomeBanner: document.getElementById('outcome-banner'),
            log: document.getElementById('console-log'),
            rsi: document.getElementById('metric-rsi'),
            ma: document.getElementById('metric-ma'),
            macd: document.getElementById('metric-macd'),
            ao: document.getElementById('metric-ao'),
        };

        this.initEventListeners();
        this.initChart();
    }

    initEventListeners() {
        this.dom.connectBtn.addEventListener('click', () => this.toggleConnection());
        this.dom.tradeBtn.addEventListener('click', () => this.purchaseContract());
        this.dom.barrierInput.addEventListener('change', () => this.requestProposal());
        this.dom.tradeTypeSelect.addEventListener('change', () => this.requestProposal());
        this.dom.stakeInput.addEventListener('change', () => this.requestProposal());
    }

    initChart() {
        const ctx = document.getElementById('liveChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], 
                datasets: [
                    {
                        label: 'Spot Price',
                        data: [],
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'MA (9)',
                        data: [],
                        borderColor: '#3b82f6',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        borderDash: [4, 4],
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 10 } } }
                },
                scales: {
                    x: { display: false },
                    y: {
                        grid: { color: '#374151' },
                        ticks: { color: '#9ca3af', font: { size: 10 } }
                    }
                }
            }
        });
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        let colorClass = 'text-emerald-400';
        if (type === 'error') colorClass = 'text-red-400';
        if (type === 'warn') colorClass = 'text-yellow-400';
        if (type === 'success') colorClass = 'text-blue-400';

        const entry = document.createElement('div');
        entry.className = colorClass;
        entry.innerText = `[${timestamp}] ${message}`;
        this.dom.log.appendChild(entry);
        this.dom.log.scrollTop = this.dom.log.scrollHeight;
    }

    displayOutcome(status, statement) {
        this.dom.outcomeBanner.classList.remove('hidden', 'bg-emerald-600', 'bg-rose-600', 'text-white');
        if (status === 'won') {
            this.dom.outcomeBanner.classList.add('bg-emerald-600', 'text-white');
            this.dom.outcomeBanner.innerText = `🏆 TRADE WON! ${statement}`;
        } else {
            this.dom.outcomeBanner.classList.add('bg-rose-600', 'text-white');
            this.dom.outcomeBanner.innerText = `❌ TRADE LOST. ${statement}`;
        }
        
        // Hide after 6 seconds smoothly
        setTimeout(() => {
            this.dom.outcomeBanner.classList.add('hidden');
        }, 6000);
    }

    toggleConnection() {
        if (this.ws) {
            this.log('Disconnecting from Deriv...', 'warn');
            this.ws.close();
            return;
        }

        this.appId = this.dom.appIdInput.value.trim();
        this.token = this.dom.tokenInput.value.trim();

        if (!this.token) {
            this.log('Error: API Token is mandatory for execution.', 'error');
            return;
        }

        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.dom.statusBadge.innerText = 'Connecting...';
            this.dom.statusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-yellow-900 text-yellow-300';
            this.log('WebSocket Connection Opened. Authenticating token...');
            this.ws.send(JSON.stringify({ authorize: this.token }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
        };

        this.ws.onclose = () => {
            this.ws = null;
            this.isAuthorized = false;
            this.dom.statusBadge.innerText = 'Disconnected';
            this.dom.statusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-900 text-red-300';
            this.dom.connectBtn.innerText = 'Connect Engine';
            this.dom.tradeBtn.disabled = true;
            this.dom.tradeBtn.className = 'bg-gray-600 cursor-not-allowed text-white font-bold px-6 py-3 rounded opacity-50';
            this.log('WebSocket completely disconnected.', 'error');
        };

        this.ws.onerror = (err) => {
            this.log(`WebSocket Error encountered: ${err.message || 'Unknown State'}`, 'error');
        };
    }

    handleIncomingMessage(data) {
        const msgType = data.msg_type;

        // 1. Authorization Response (Contains Balance info initially)
        if (msgType === 'authorize') {
            if (data.error) {
                this.log(`Authorization failed: ${data.error.message}`, 'error');
                this.ws.close();
            } else {
                this.isAuthorized = true;
                this.dom.statusBadge.innerText = 'Authorized';
                this.dom.statusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-300';
                this.dom.connectBtn.innerText = 'Disconnect';
                
                // Set initial balance display
                if (data.authorize.balance) {
                    this.dom.balanceDisplay.innerText = `$${parseFloat(data.authorize.balance).toFixed(2)}`;
                }
                
                this.log(`Welcome ${data.authorize.email}. Session authorized successfully.`, 'success');
                
                // Subscribe to ticks stream & transactions to capture win/loss
                this.subscribeToTicks();
                this.subscribeToTransactions();
            }
        }

        // 2. Continuous Balance & Transaction State Changes
        if (msgType === 'transaction') {
            if (data.transaction) {
                const tx = data.transaction;
                if (tx.balance) {
                    this.dom.balanceDisplay.innerText = `$${parseFloat(tx.balance).toFixed(2)}`;
                }
                
                // Detect when a contract position closing settles contract profits
                if (tx.action === 'sell') {
                    const profit = parseFloat(tx.amount);
                    if (profit > 0) {
                        this.displayOutcome('won', `Profit: +$${profit.toFixed(2)}`);
                        this.log(`Contract settled: WIN. Amount applied: +$${profit.toFixed(2)}`, 'success');
                    } else {
                        this.displayOutcome('lost', `Loss: $${profit.toFixed(2)}`);
                        this.log(`Contract settled: LOSS. Amount applied: $${profit.toFixed(2)}`, 'error');
                    }
                }
            }
        }

        // 3. Tick Processing
        if (msgType === 'ticks') {
            if (data.tick) {
                this.processTick(data.tick);
            }
        }

        // 4. Contract Proposal Processing
        if (msgType === 'proposal') {
            if (data.error) {
                this.dom.payoutDisplay.innerText = 'Payout Dynamic: Invalid Config';
                this.dom.tradeBtn.disabled = true;
            } else if (data.proposal) {
                this.currentProposalId = data.proposal.id;
                const payoutPct = (((data.proposal.payout - data.proposal.ask_price) / data.proposal.ask_price) * 100).toFixed(2);
                this.dom.payoutDisplay.innerText = `Payout: +${payoutPct}% ($${data.proposal.payout})`;
                
                if(this.isAuthorized) {
                    this.dom.tradeBtn.disabled = false;
                    this.dom.tradeBtn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded transition shadow-md cursor-pointer';
                }
            }
        }

        if (msgType === 'buy') {
            if (data.error) {
                this.log(`Execution Failure: ${data.error.message}`, 'error');
            } else {
                this.log(`Position Executed! Contract ID: ${data.buy.contract_id}.`, 'success');
            }
        }
    }

    subscribeToTicks() {
        const marketSymbol = this.dom.marketSelect.value;
        this.log(`Subscribing to live symbol feed for: ${marketSymbol}`);
        this.ws.send(JSON.stringify({ ticks: marketSymbol }));
        this.requestProposal();
    }

    subscribeToTransactions() {
        // Keeps user's balance and contract settlement tracking live automatically
        this.ws.send(JSON.stringify({ transaction: 1 }));
    }

    requestProposal() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const contractType = this.dom.tradeTypeSelect.value === 'LOWER' ? 'PUT' : 'CALL';
        const barrierOffset = this.dom.barrierInput.value.trim();
        const stake = parseFloat(this.dom.stakeInput.value) || 10;
        const symbol = this.dom.marketSelect.value;

        const requestPayload = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            duration: 5,
            duration_unit: 't', 
            symbol: symbol,
            barrier: barrierOffset
        };

        this.ws.send(JSON.stringify(requestPayload));
    }

    processTick(tick) {
        const price = tick.quote;
        this.dom.spotDisplay.innerText = price.toFixed(4);
        
        this.prices.push(price);
        
        // Calculate MA dynamically to plot on chart matching background matrix calculations
        let currentMA = null;
        if (this.prices.length >= 9) {
            currentMA = this.calculateSMA(this.prices, 9);
            this.maValues.push(currentMA);
        } else {
            this.maValues.push(price); // Fallback placement proxy
        }

        if (this.prices.length > this.maxDataPoints) {
            this.prices.shift();
            this.maValues.shift();
        }

        // Render data onto visible chart interface elements
        this.updateChart(price, currentMA);

        if (this.prices.length >= 34) {
            this.runIndicatorsAndAI();
        }
    }

    updateChart(price, ma) {
        if (!this.chart) return;

        // Generate timestamps as dynamic horizontal plot indicators labels
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.chart.data.labels.push(timeLabel);
        this.chart.data.datasets[0].data.push(price);
        this.chart.data.datasets[1].data.push(ma || price);

        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }

        this.chart.update('none'); // Update smoothly without breaking interface responsiveness animations
    }

    runIndicatorsAndAI() {
        const rsiValue = this.calculateRSI(this.prices, 14);
        const maValue = this.calculateSMA(this.prices, 9);
        const macdData = this.calculateMACD(this.prices);
        const aoValue = this.calculateAwesomeOscillator(this.prices);

        const currentPrice = this.prices[this.prices.length - 1];

        this.dom.rsi.innerText = rsiValue.toFixed(2);
        this.dom.ma.innerText = maValue.toFixed(4);
        this.dom.macd.innerText = `${macdData.histogram.toFixed(4)}`;
        this.dom.ao.innerText = aoValue.toFixed(4);

        // Confluence parameters for 5-tick automated validation pipeline checks
        const isRsiOverbought = rsiValue > 55;
        const isBelowMA = currentPrice < maValue;
        const isMacdBearish = macdData.histogram < 0;
        const isAoBearish = aoValue < 0;

        const isRsiOversold = rsiValue < 45;
        const isAboveMA = currentPrice > maValue;
        const isMacdBullish = macdData.histogram > 0;
        const isAoBullish = aoValue > 0;

        const activeChoice = this.dom.tradeTypeSelect.value;

        if (activeChoice === 'LOWER' && isRsiOverbought && isBelowMA && isMacdBearish && isAoBearish) {
            this.log("AI Strategy Met: Perfect 5-Tick BEARISH Confluence alignment mapped.", "success");
            this.purchaseContract();
        } else if (activeChoice === 'HIGHER' && isRsiOversold && isAboveMA && isMacdBullish && isAoBullish) {
            this.log("AI Strategy Met: Perfect 5-Tick BULLISH Confluence alignment mapped.", "success");
            this.purchaseContract();
        }
    }

    purchaseContract() {
        if (!this.ws || !this.currentProposalId || !this.isAuthorized) return;

        this.log(`Sending execution call order for proposal ID: ${this.currentProposalId}`);
        this.ws.send(JSON.stringify({
            buy: this.currentProposalId,
            price: parseFloat(this.dom.stakeInput.value) || 10
        }));

        this.currentProposalId = null; 
        this.dom.tradeBtn.disabled = true;
        setTimeout(() => this.requestProposal(), 1000);
    }

    calculateSMA(data, period) {
        const slice = data.slice(-period);
        return slice.reduce((sum, val) => sum + val, 0) / period;
    }

    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return 50;
        let gains = 0, losses = 0;
        for (let i = data.length - period; i < data.length; i++) {
            const difference = data[i] - data[i - 1];
            if (difference > 0) gains += difference;
            else losses -= difference;
        }
        if (losses === 0) return 100;
        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(data) {
        const ema12 = this.calculateSMA(data, 12);
        const ema26 = this.calculateSMA(data, 26);
        const macdLine = ema12 - ema26;
        const signalLine = this.calculateSMA(data.slice(-9), 9);
        return { histogram: macdLine - signalLine };
    }

    calculateAwesomeOscillator(data) {
        const midpoints = data.map((val, idx) => idx === 0 ? val : (val + data[idx - 1]) / 2);
        return this.calculateSMA(midpoints, 5) - this.calculateSMA(midpoints, 34);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.BotEngine = new AdvancedDerivBot();
});
