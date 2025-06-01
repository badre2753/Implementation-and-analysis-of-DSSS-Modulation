const components = [
            { id: 'binarySeq', name: 'Binary Sequence', x: 50, y: 100, width: 120, height: 60, 
              connectors: [{ x: 170, y: 135, type: 'output', id: 'bitsOut' }] },
            { id: 'nrzEncoder', name: 'NRZ Encoder', x: 200, y: 25, width: 100, height: 60, 
              connectors: [{ x: 220, y: 55, type: 'input', id: 'nrzIn' }, { x: 320, y: 55, type: 'output', id: 'nrzOut' }] },
            { id: 'xorGate', name: 'XOR Gate', x: 350, y: 150, width: 80, height: 60, 
              connectors: [{ x: 350, y: 170, type: 'input', id: 'xorIn1' }, 
                          { x: 350, y: 200, type: 'input', id: 'xorIn2' }, 
                          { x: 440, y: 180, type: 'output', id: 'xorOut' }] },
            { id: 'carrierGen', name: 'Carrier Generator', x: 150, y: 250, width: 120, height: 60,
              connectors: [{ x: 280, y: 280, type: 'output', id: 'carrierOut' }] },
            { id: 'binaryPsk', name: 'BPSK Modulator', x: 500, y: 200, width: 100, height: 60, 
              connectors: [{ x: 500, y: 210, type: 'input', id: 'pskDataIn' },
                          { x: 500, y: 250, type: 'input', id: 'pskCarrierIn' },
                          { x: 600, y: 225, type: 'output', id: 'pskOut' }] },
            { id: 'pnGenerator', name: 'PN Code Generator', x: 200, y: 350, width: 120, height: 60, 
              connectors: [{ x: 340, y: 382, type: 'output', id: 'pnOut' }] },
            { id: 'outputSignal', name: 'Spread & Modulted Signal', x: 700, y: 200, width: 100, height: 60, 
              connectors: [{ x: 700, y: 230, type: 'input', id: 'signalIn' }] }
        ];

        // Global variables
        let connections = [];
        let selectedConnector = null;
        let bitSequence = '1010';
        let carrierFreq = 1;
        let chipsPerBit = 8;
        let waveforms = {};
        let isSimulating = false;
        let animationId = null;
        let isPoweredOn = false;
        let timeScale = 5;
        let ampScale = 5;

        // Initialize the circuit
        function initCircuit() {
            const container = document.getElementById('circuit-container');
            
            // Create components
            components.forEach(comp => {
                const div = document.createElement('div');
                div.className = 'component';
                div.id = comp.id;
                div.style.left = comp.x + 'px';
                div.style.top = comp.y + 'px';
                div.style.width = comp.width + 'px';
                div.style.height = comp.height + 'px';
                div.innerHTML = `<strong>${comp.name}</strong>`;
                container.appendChild(div);
                
                // Add connectors
                comp.connectors.forEach(conn => {
                    const connector = document.createElement('div');
                    connector.className = `connector ${conn.type}`;
                    connector.dataset.component = comp.id;
                    connector.dataset.connector = conn.id;
                    connector.dataset.type = conn.type;
                    connector.style.left = (comp.x + conn.x - comp.x - 6) + 'px';
                    connector.style.top = (comp.y + conn.y - comp.y - 6) + 'px';
                    connector.addEventListener('mousedown', startConnection);
                    connector.addEventListener('mouseup', endConnection);
                    container.appendChild(connector);
                });
            });
            
            // Set up event listeners
            document.getElementById('powerButton').addEventListener('click', togglePower);
            document.getElementById('updateBits').addEventListener('click', updateParameters);
            document.getElementById('showWaveforms').addEventListener('click', toggleWaveforms);
            document.getElementById('clearConnections').addEventListener('click', clearConnections);
            document.getElementById('helpConnections').addEventListener('click', toggleConnectionGuide);
            document.getElementById('timeScale').addEventListener('input', updateTimeScale);
            document.getElementById('ampScale').addEventListener('input', updateAmpScale);
            
            // Make components draggable
            document.querySelectorAll('.component').forEach(comp => {
                makeDraggable(comp);
            });
            
            // Initialize oscilloscope
            initOscilloscope();
        }

        // Toggle power state
        function togglePower() {
            isPoweredOn = !isPoweredOn;
            const powerButton = document.getElementById('powerButton');
            
            if (isPoweredOn) {
                powerButton.textContent = 'POWER ON';
                powerButton.classList.add('on');
                document.getElementById('status').textContent = 'System is ON - Set your parameters';
                document.getElementById('inputControls').style.display = 'block';
                document.getElementById('connectionControls').style.display = 'none';
                document.getElementById('oscilloscope').style.display = 'none';
                document.getElementById('connection-guide').style.display = 'none';
            } else {
                powerButton.textContent = 'POWER OFF';
                powerButton.classList.remove('on');
                document.getElementById('status').textContent = 'System is OFF';
                document.getElementById('inputControls').style.display = 'none';
                document.getElementById('connectionControls').style.display = 'none';
                document.getElementById('oscilloscope').style.display = 'none';
                document.getElementById('showWaveforms').style.display = 'none';
                document.getElementById('connection-guide').style.display = 'none';
                
                if (isSimulating) {
                    cancelAnimationFrame(animationId);
                    isSimulating = false;
                }
            }
        }

        // Toggle connection guide
        function toggleConnectionGuide() {
            const guide = document.getElementById('connection-guide');
            guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
        }

        // Update parameters from user input
        function updateParameters() {
            const bitsInput = document.getElementById('bitSequence').value;
            const freqInput = parseFloat(document.getElementById('carrierFreq').value);
            const chipsInput = parseInt(document.getElementById('chipsPerBit').value);
            
            if (/^[01]+$/.test(bitsInput)) {
                bitSequence = bitsInput;
                carrierFreq = Math.min(Math.max(freqInput, 0.1), 10);
                chipsPerBit = Math.min(Math.max(chipsInput, 1), 16);
                showSuccess("Parameters updated successfully!");
                generateWaveforms();
                document.getElementById('connectionControls').style.display = 'block';
                document.getElementById('status').textContent = 'System is ON - Now make your connections';
            } else {
                showWarning("Invalid input! Only binary digits (0,1) allowed in sequence.");
            }
        }

        // Make components draggable
        function makeDraggable(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            
            element.onmousedown = dragMouseDown;
            
            function dragMouseDown(e) {
                if (!isPoweredOn) return;
                e = e || window.event;
                e.preventDefault();
                // Get the mouse cursor position at startup
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }
            
            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                // Calculate the new cursor position
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                // Set the element's new position
                element.style.top = (element.offsetTop - pos2) + "px";
                element.style.left = (element.offsetLeft - pos1) + "px";
                
                // Update connector positions
                updateConnectors(element.id);
            }
            
            function closeDragElement() {
                // Stop moving when mouse button is released
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }

        // Update connector positions when component is dragged
        function updateConnectors(componentId) {
            const comp = components.find(c => c.id === componentId);
            if (!comp) return;
            
            const componentDiv = document.getElementById(componentId);
            const compX = parseInt(componentDiv.style.left);
            const compY = parseInt(componentDiv.style.top);
            
            comp.connectors.forEach(conn => {
                const connector = document.querySelector(`.connector[data-component="${componentId}"][data-connector="${conn.id}"]`);
                if (connector) {
                    connector.style.left = (compX + conn.x - comp.x - 6) + 'px';
                    connector.style.top = (compY + conn.y - comp.y - 6) + 'px';
                }
            });
            
            // Redraw connections
            redrawConnections();
        }

        // Start a new connection
        function startConnection(e) {
            if (!isPoweredOn) return;
            e.stopPropagation();
            
            // Only allow starting from output connectors
            if (e.target.dataset.type === 'output') {
                selectedConnector = e.target;
                e.target.style.transform = 'scale(1.3)';
                e.target.style.boxShadow = '0 0 5px 2px yellow';
            } else {
                showWarning("Please start connections from output connectors (green)!");
            }
        }

        // End a connection
        function endConnection(e) {
            if (!isPoweredOn || !selectedConnector) return;
            e.stopPropagation();
            
            const targetConnector = e.target;
            
            // Reset selected connector style
            selectedConnector.style.transform = '';
            selectedConnector.style.boxShadow = '';
            
            // Don't connect to itself
            if (selectedConnector === targetConnector) {
                return;
            }
            
            // Only allow connecting to input connectors
            if (targetConnector.dataset.type !== 'input') {
                showWarning("Must connect to an input connector (red)!");
                selectedConnector = null;
                return;
            }
            
            // Check if this connection already exists
            const existingConnection = connections.find(conn => 
                conn.source === selectedConnector.dataset.connector && 
                conn.target === targetConnector.dataset.connector);
            
            if (existingConnection) {
                showWarning("This connection already exists!");
                selectedConnector = null;
                return;
            }
            
            // Check if target already has a connection
            const targetHasConnection = connections.some(conn => 
                conn.target === targetConnector.dataset.connector);
            
            if (targetHasConnection) {
                showWarning("This input already has a connection!");
                selectedConnector = null;
                return;
            }
            
            // Check for valid circuit connections
            if (!validateConnection(selectedConnector.dataset.connector, targetConnector.dataset.connector)) {
                showWarning("Invalid connection for this circuit! See connection guide for proper connections.");
                selectedConnector = null;
                return;
            }
            
            // Add the new connection
            connections.push({
                source: selectedConnector.dataset.connector,
                sourceComponent: selectedConnector.dataset.component,
                target: targetConnector.dataset.connector,
                targetComponent: targetConnector.dataset.component
            });
            
            // Redraw all connections
            redrawConnections();
            
            selectedConnector = null;
            showSuccess("Connection made successfully!");
            
            // Show waveform button if all required connections are made
            checkConnections();
        }

        // Validate if connection makes sense in this circuit
        function validateConnection(source, target) {
            // Valid connections in this DSSS circuit:
            const validConnections = {
                'bitsOut': ['nrzIn'],
                'nrzOut': ['xorIn1'],
                'pnOut': ['xorIn2'],
                'xorOut': ['pskDataIn'],
                'carrierOut': ['pskCarrierIn'],
                'pskOut': ['signalIn']
            };
            
            return validConnections[source] && validConnections[source].includes(target);
        }

        // Check if all required connections are made
        function checkConnections() {
            const requiredConnections = [
                { source: 'bitsOut', target: 'nrzIn' },
                { source: 'nrzOut', target: 'xorIn1' },
                { source: 'pnOut', target: 'xorIn2' },
                { source: 'xorOut', target: 'pskDataIn' },
                { source: 'carrierOut', target: 'pskCarrierIn' },
                { source: 'pskOut', target: 'signalIn' }
            ];
            
            const allConnected = requiredConnections.every(req => {
                return connections.some(conn => 
                    conn.source === req.source && conn.target === req.target);
            });
            
            if (allConnected) {
                document.getElementById('showWaveforms').style.display = 'inline-block';
                document.getElementById('status').textContent = 'System is ON - All connections made! Click "Show Waveforms"';
                showSuccess("All connections are correct! You can now view the waveforms.");
            } else {
                document.getElementById('status').textContent = 'System is ON - Make all required connections';
            }
        }

        // Redraw all connections
        function redrawConnections() {
            // Remove old connections
            document.querySelectorAll('.connection').forEach(el => el.remove());
            
            // Draw new connections
            connections.forEach(conn => {
                const sourceComp = components.find(c => c.id === conn.sourceComponent);
                const targetComp = components.find(c => c.id === conn.targetComponent);
                
                if (!sourceComp || !targetComp) return;
                
                const sourceConn = sourceComp.connectors.find(c => c.id === conn.source);
                const targetConn = targetComp.connectors.find(c => c.id === conn.target);
                
                if (!sourceConn || !targetConn) return;
                
                const sourceDiv = document.getElementById(conn.sourceComponent);
                const targetDiv = document.getElementById(conn.targetComponent);
                
                const x1 = parseInt(sourceDiv.style.left) + sourceConn.x - sourceComp.x;
                const y1 = parseInt(sourceDiv.style.top) + sourceConn.y - sourceComp.y;
                const x2 = parseInt(targetDiv.style.left) + targetConn.x - targetComp.x;
                const y2 = parseInt(targetDiv.style.top) + targetConn.y - targetComp.y;
                
                drawConnection(x1, y1, x2, y2);
            });
        }

        // Draw a single connection line
        function drawConnection(x1, y1, x2, y2) {
            const length = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
            
            const connection = document.createElement('div');
            connection.className = 'connection';
            connection.style.width = length + 'px';
            connection.style.left = x1 + 'px';
            connection.style.top = y1 + 'px';
            connection.style.transform = `rotate(${angle}deg)`;
            
            document.getElementById('circuit-container').appendChild(connection);
        }

        // Clear all connections
        function clearConnections() {
            connections = [];
            redrawConnections();
            document.getElementById('showWaveforms').style.display = 'none';
            document.getElementById('status').textContent = 'System is ON - Make all required connections';
            hideMessages();
            
            if (isSimulating) {
                cancelAnimationFrame(animationId);
                isSimulating = false;
                document.getElementById('showWaveforms').textContent = 'Show Waveforms';
                document.getElementById('oscilloscope').style.display = 'none';
            }
        }

        // Show warning message
        function showWarning(message) {
            const warningElement = document.getElementById('warning');
            warningElement.textContent = message;
            warningElement.style.display = 'block';
            document.getElementById('success').style.display = 'none';
            
            setTimeout(() => {
                warningElement.style.display = 'none';
            }, 5000);
        }

        // Show success message
        function showSuccess(message) {
            const successElement = document.getElementById('success');
            successElement.textContent = message;
            successElement.style.display = 'block';
            document.getElementById('warning').style.display = 'none';
            
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        }

        // Hide all messages
        function hideMessages() {
            document.getElementById('warning').style.display = 'none';
            document.getElementById('success').style.display = 'none';
        }

        // Update time scale
        function updateTimeScale() {
            timeScale = parseInt(document.getElementById('timeScale').value);
        }

        // Update amplitude scale
        function updateAmpScale() {
            ampScale = parseInt(document.getElementById('ampScale').value);
        }

        // Initialize oscilloscope
        function initOscilloscope() {
            generateWaveforms();
        }

        // Generate waveforms for the circuit
        function generateWaveforms() {
            const samplesPerBit = 50;
            
            // Generate binary sequence (original data)
            const binaryWave = generateBinaryWave(bitSequence, samplesPerBit);
            
            // Generate NRZ encoded waveform
            const nrzWave = generateNRZWave(bitSequence, samplesPerBit);
            
            // Generate PN sequence (should have higher rate than data)
            const pnWave = generatePNSequence(bitSequence.length * samplesPerBit, chipsPerBit);
            
            // Generate XOR output (spread signal)
            const xorWave = generateXORWave(nrzWave, pnWave, samplesPerBit, chipsPerBit);
            
            // Generate carrier wave
            const carrierWave = generateCarrierWave(bitSequence.length * samplesPerBit, carrierFreq);
            
            // Generate PSK modulated wave
            const pskWave = generatePSKWave(xorWave, carrierWave);
            
            waveforms = {
                binarySequence: binaryWave,
                nrzEncoded: nrzWave,
                pnSequence: pnWave,
                xorOutput: xorWave,
                carrierSignal: carrierWave,
                pskModulated: pskWave,
                outputSignal: pskWave
            };
            
            if (isSimulating) {
                cancelAnimationFrame(animationId);
                drawOscilloscope();
            }
        }

        // Generate binary waveform
        function generateBinaryWave(bits, samplesPerBit) {
            const wave = [];
            for (let i = 0; i < bits.length; i++) {
                const value = parseInt(bits[i]);
                for (let j = 0; j < samplesPerBit; j++) {
                    wave.push(value);
                }
            }
            return wave;
        }

        // Generate NRZ waveform
        function generateNRZWave(bits, samplesPerBit) {
            const wave = [];
            for (let i = 0; i < bits.length; i++) {
                const value = parseInt(bits[i]) * 2 - 1; // 0 -> -1, 1 -> 1
                for (let j = 0; j < samplesPerBit; j++) {
                    wave.push(value);
                }
            }
            return wave;
        }

        // Generate PN sequence with proper chip rate
        function generatePNSequence(length, chipsPerBit) {
            const wave = [];
            // Using a longer PN sequence for better visualization
            const pattern = [1, -1, 1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, 1, -1];
            for (let i = 0; i < length; i++) {
                // Repeat each PN chip for (samplesPerBit/chipsPerBit) samples
                const chip = pattern[Math.floor(i * chipsPerBit / 50) % pattern.length];
                wave.push(chip);
            }
            return wave;
        }

        // Generate carrier wave
        function generateCarrierWave(length, freq) {
            const wave = [];
            for (let i = 0; i < length; i++) {
                const t = i / 50; // 50 samples per bit
                wave.push(Math.cos(2 * Math.PI * freq * t));
            }
            return wave;
        }

        // Generate XOR output waveform with proper synchronization
        function generateXORWave(nrzWave, pnWave, samplesPerBit, chipsPerBit) {
            const wave = [];
            for (let i = 0; i < nrzWave.length; i++) {
                // For DSSS, we need to XOR each data bit with multiple PN chips
                const dataBit = nrzWave[i] > 0 ? 1 : 0;
                const pnIndex = Math.floor(i * chipsPerBit / samplesPerBit);
                const pnBit = pnWave[pnIndex % pnWave.length] > 0 ? 1 : 0;
                const xorResult = dataBit ^ pnBit;
                wave.push(xorResult * 2 - 1); // Convert to -1/1
            }
            return wave;
        }

        // Generate PSK modulated wave with proper phase shifts
        function generatePSKWave(dataWave, carrierWave) {
            const wave = [];
            for (let i = 0; i < dataWave.length; i++) {
                // For BPSK, phase shift of 180° for negative data
                const phaseShift = dataWave[i] > 0 ? 0 : Math.PI;
                wave.push(Math.cos(2 * Math.PI * carrierFreq * (i/50) + phaseShift));
            }
            return wave;
        }

        // Toggle waveforms display
        function toggleWaveforms() {
            if (isSimulating) {
                cancelAnimationFrame(animationId);
                isSimulating = false;
                document.getElementById('showWaveforms').textContent = 'Show Waveforms';
                document.getElementById('oscilloscope').style.display = 'none';
                document.getElementById('status').textContent = 'System is ON - Waveforms stopped';
            } else {
                isSimulating = true;
                document.getElementById('showWaveforms').textContent = 'Stop Waveforms';
                document.getElementById('oscilloscope').style.display = 'block';
                drawOscilloscope();
                document.getElementById('status').textContent = 'System is ON - Showing waveforms';
            }
        }

        // Draw waveforms on oscilloscope
        function drawOscilloscope() {
            const canvas = document.getElementById('scopeCanvas');
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);
            
            // Draw grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            
            // Horizontal grid lines
            for (let y = 0; y <= height; y += height / 14) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            
            // Vertical grid lines
            for (let x = 0; x <= width; x += width / 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            
            // Draw center line
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height/2);
            ctx.lineTo(width, height/2);
            ctx.stroke();
            
            // Draw waveforms
            const time = Date.now() / 1000;
            const offset = Math.floor(time * timeScale) % (waveforms.binarySequence.length - width);
            const amplitude = height / (16 * ampScale);
            
            // Binary Sequence (yellow)
            drawWaveform(ctx, waveforms.binarySequence, offset, width, amplitude, 'yellow', height/7);
            
            // NRZ Encoded (cyan)
            drawWaveform(ctx, waveforms.nrzEncoded, offset, width, amplitude, 'cyan', 2*height/7);
            
            // PN Sequence (magenta)
            drawWaveform(ctx, waveforms.pnSequence, offset, width, amplitude, 'magenta', 3*height/7);
            
            // XOR Output (orange)
            drawWaveform(ctx, waveforms.xorOutput, offset, width, amplitude, 'orange', 4*height/7);
            
            // Carrier Signal (white)
            drawWaveform(ctx, waveforms.carrierSignal, offset, width, amplitude, 'white', 5*height/7);
            
            // PSK Modulated (green)
            drawWaveform(ctx, waveforms.pskModulated, offset, width, amplitude, 'lime', 6*height/7);
            
            // Labels
            ctx.font = '12px Arial';
            ctx.fillStyle = 'yellow';
            ctx.fillText('Binary Sequence', 10, height/7 - 5);
            ctx.fillStyle = 'cyan';
            ctx.fillText('NRZ Encoded', 10, 2*height/7 - 5);
            ctx.fillStyle = 'magenta';
            ctx.fillText('PN Sequence', 10, 3*height/7 - 5);
            ctx.fillStyle = 'orange';
            ctx.fillText('XOR Output', 10, 4*height/7 - 5);
            ctx.fillStyle = 'white';
            ctx.fillText('Carrier Signal', 10, 5*height/7 - 5);
            ctx.fillStyle = 'lime';
            ctx.fillText('BPSK Modulated', 10, 6*height/7 - 5);
            
            if (isSimulating) {
                animationId = requestAnimationFrame(drawOscilloscope);
            }
        }

        // Draw a single waveform
        function drawWaveform(ctx, data, offset, width, amp, color, yOffset) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const centerY = yOffset;
            
            for (let x = 0; x < width; x++) {
                const sample = data[(offset + x) % data.length] || 0;
                const y = centerY - sample * amp;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }

        // Initialize the simulation when page loads
        window.onload = initCircuit;