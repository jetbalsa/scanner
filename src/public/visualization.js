// Particle Movement Settings
const PARTICLE_BASE_VELOCITY = 2; // Base velocity multiplier for non-food particles
const FOOD_VELOCITY = 0.7; // Base velocity multiplier for food particles
const FOOD_LIFETIME = 60000; // Food particles will be removed after 15 seconds if not eaten
const SEEK_FORCE = 0.2; // Force applied when particles seek food
const RANDOM_MOVEMENT = 0.1; // Random movement multiplier for natural motion
const GRAVITATIONAL_FORCE = 0; // Force pulling particles toward section center
const VELOCITY_DAMPENING = 0.95; // Dampening factor for smooth movement
const BOUNCE_FORCE = 0.1; // Force applied when particles bounce off boundaries

// Particle Size Settings
const MIN_PARTICLE_RADIUS = 0.5; // Minimum radius for any particle
const FOOD_SIZE_MULTIPLIER = 0.2; // Size multiplier for food particles
const MAX_FOOD_SIZE = 50; // Maximum size for food particles
const PARTICLE_SIZE_MULTIPLIER = 0.5; // Size multiplier for non-food particles
const MAX_PARTICLE_SIZE = 10; // Maximum size for non-food particles
const DOMAIN_TEXT_THRESHOLD = 8; // Minimum radius for showing domain text

// Food Particle Movement
const FOOD_FLOW_STRENGTH = 0.02; // Base flow force towards center for food
const FOOD_CIRCULAR_STRENGTH = 0.5; // Strength of circular motion for food
const FOOD_RANDOM_MOVEMENT = 0.2; // Random movement multiplier for food
const FOOD_DAMPENING = 0.70; // Dampening factor for food particles
const FOOD_BOUNDS_THRESHOLD = 0.4; // Threshold for distance from center (as percentage of section size)
const FOOD_SUPER_PUSH_STRENGTH = 0.1; // Stronger force when food is too far from center

// Visual Settings
const USE_DOLLAR_SIGNS = true; // Flag to switch between triangles and dollar signs
const PARTICLE_COLOR_SATURATION = '70%'; // HSL saturation for particles
const PARTICLE_COLOR_LIGHTNESS = '50%'; // HSL lightness for particles
const PARTICLE_COLOR_ALPHA = 0.6; // Alpha transparency for particles
const FOOD_COLOR_LIGHTNESS = '80%'; // HSL lightness for food particles
const GLOW_DECAY_RATE = 0.95; // Rate at which particle glow effect fades

// Batch Processing Settings
const DEFAULT_BATCH_SIZE = 300; // Number of particles to process per batch
const BATCH_INTERVAL = 100; // Time between batches in milliseconds
const FOOD_BATCH_THRESHOLD = 100; // Start batching food when buffer exceeds this count
const MAX_ACTIVE_FOOD = 100; // Maximum number of food particles allowed on field

// Section Settings
const MAX_PARTICLE_SIZE_PERCENT = 0.10; // Maximum particle size as percentage of section size
const SECTION_TRANSITION_SPEED = 0.1; // Speed of section position/size transitions

// Particle Shrinking Settings
const BASE_SHRINK_RATE = 0.4; // Base rate at which particles shrink over time
const SMALL_PARTICLE_MULTIPLIER = 1.5; // Multiplier for shrinking small particles faster
const SHRINK_THRESHOLD = 7; // Threshold below which particles shrink faster
const REMOVAL_THRESHOLD = 6; // Threshold below which particles are removed
const SHRINK_INTERVAL = 0.016; // Time interval for shrinking calculation
const SIZE_INTERPOLATION_SPEED = 0.1; // Speed of size transitions
const USE_CASH_REGISTER = true; 

class Particle {
    constructor(x, y, radius, domain, color, isFood = false) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * (isFood ? FOOD_VELOCITY : PARTICLE_BASE_VELOCITY);
        // Assign a random base frequency for this DNS blob's eating sound
        this.baseFrequency = !isFood ? 150 + Math.random() * 150 : 0; // Range: 150-300Hz
        this.vy = (Math.random() - 0.5) * (isFood ? FOOD_VELOCITY : PARTICLE_BASE_VELOCITY);
        this.createdAt = Date.now(); // Track creation time for food lifetime
        this.radius = isFood ? Math.min(radius * FOOD_SIZE_MULTIPLIER, MAX_FOOD_SIZE) : Math.min(radius * PARTICLE_SIZE_MULTIPLIER, MAX_PARTICLE_SIZE);
        this.targetRadius = this.radius;
        this.domain = domain;
        this.baseDomain = this.getBaseDomain(domain);
        this.currentTrackedFood = null;
        this.foodTrackingStartTime = null;
        if (isFood) {
            // Parse the HSLA color
            const hslaMatch = color.match(/hsla\((\d+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
            if (hslaMatch) {
                const [_, hue, saturation, lightness, alpha] = hslaMatch;
                // Parse the lightness percentage and vary it by ±15%
                const baseLightness = parseFloat(lightness);
                const variation = (Math.random() * 30 - 15); // Random value between -15 and +15
                const newLightness = Math.max(0, Math.min(100, baseLightness + variation));
                this.color = `hsla(${hue}, ${saturation}, ${newLightness}%, ${alpha})`;
            } else {
                this.color = color; // Fallback if parsing fails
            }
        } else {
            this.color = color;
        }
        this.merged = false;
        this.isFood = isFood;
        this.glowIntensity = 0;
        this.lastFed = Date.now();
    }

    getBaseDomain(domain) {
        const parts = domain.split('.');
        // Always return just the last two parts (maindomain.tld)
        return parts.slice(-2).join('.');
    }

    findNearestFood(particles, section) {
        let nearestFood = null;
        let minDistance = Infinity;
        const now = Date.now();
        // Calculate stopRadius as percentage of the smallest section dimension
        const percentageFromCenter = 0.25; // 25% of the smallest dimension
        const smallestDimension = Math.min(section.width, section.height);
        const stopRadius = smallestDimension * percentageFromCenter;
        const centerX = section.x + section.width / 2;
        const centerY = section.y + section.height / 2;

        particles.forEach(p => {
            if (p.isFood && p.baseDomain === this.baseDomain) {
                const dist = this.distanceTo(p);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestFood = p;
                }
            }
        });
        // Check if we're tracking a new food particle
        if (nearestFood !== this.currentTrackedFood) {
            this.currentTrackedFood = nearestFood;
            this.foodTrackingStartTime = now;
        }
        // If we've been tracking the same food for too long (10 seconds)
        else if (nearestFood && (now - this.foodTrackingStartTime) > 10000) {
            // Teleport the food particle to the center of the screen
            // Teleport to center if out of bounds
            nearestFood.x = section.x + section.width / 2;
            nearestFood.y = section.y + section.height / 2;
            
            // Apply strong push force toward center
            nearestFood.vx = 0;
            nearestFood.vy = 0;
            console.log("Food Reset due to idle!", nearestFood)
            // Reset the tracking timer
            this.foodTrackingStartTime = now;
        }

        if (!nearestFood) {
            // Calculate distance to center
            const distToCenter = Math.sqrt(
                Math.pow(this.x - centerX, 2) + 
                Math.pow(this.y - centerY, 2)
            );
    
            // If we're outside the stop radius, return a virtual target at the center
            if (distToCenter > stopRadius) {
                return {
                    x: centerX,
                    y: centerY,
                    isVirtualTarget: true // Flag to indicate this isn't a real food particle
                };
            } else {
                // Inside stop radius - return null to stop movement
                return null;
            }
        }
        return nearestFood;
    }

    update(width, height, section, particles) {
        if (!this.isFood) {
            // Shrink over time with size-dependent rate
            const timeSinceLastFed = (Date.now() - this.lastFed) / 1000;
            let currentShrinkRate = BASE_SHRINK_RATE;
            if (timeSinceLastFed > 35) { // 2 minutes in seconds
                currentShrinkRate *= 4;
            }else{
            }
            
            // Apply faster shrinking for smaller particles
            if (this.targetRadius < SHRINK_THRESHOLD) {
                const sizeFactor = 1 + (SHRINK_THRESHOLD - this.targetRadius) / SHRINK_THRESHOLD;
                currentShrinkRate = BASE_SHRINK_RATE * SMALL_PARTICLE_MULTIPLIER * sizeFactor;
            }
            
            this.targetRadius = Math.max(MIN_PARTICLE_RADIUS, this.targetRadius - currentShrinkRate * SHRINK_INTERVAL);
            
            // Smoothly interpolate current radius to target
            this.radius += (this.targetRadius - this.radius) * SIZE_INTERPOLATION_SPEED;
            
            // Mark for removal if too small
            if (this.radius < REMOVAL_THRESHOLD) {
                this.merged = true;
            }
            
            // Decay glow
            this.glowIntensity *= GLOW_DECAY_RATE;

            // Find nearest food particle of same domain
            const nearestFood = this.findNearestFood(particles, section);
            
            // Calculate center of section
            const centerX = section.x + section.width / 2;
            const centerY = section.y + section.height / 2;
            
            if (nearestFood) {

                // Calculate direction to food
                const dx = nearestFood.x - this.x;
                const dy = nearestFood.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    // Normalize direction and apply seeking force
                    this.vx += (dx / dist) * SEEK_FORCE;
                    this.vy += (dy / dist) * SEEK_FORCE;
                    
                    // Add some randomness to movement to make it more natural
                    this.vx += (Math.random() - 0.5) * RANDOM_MOVEMENT;
                    this.vy += (Math.random() - 0.5) * RANDOM_MOVEMENT;
                }
            } else {
                // When idle (no food), gravitate towards center
                const dx = centerX - this.x;
                const dy = centerY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    this.vx += (dx / dist) * GRAVITATIONAL_FORCE;
                    this.vy += (dy / dist) * GRAVITATIONAL_FORCE;
                }
            }
            
            // Dampen velocity for smooth movement
            this.vx *= VELOCITY_DAMPENING;
            this.vy *= VELOCITY_DAMPENING;
        } else {
            // Food particles flow towards center with some randomness
            const centerX = section.x + section.width / 2;
            const centerY = section.y + section.height / 2;
            const dx = centerX - this.x;
            const dy = centerY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate max allowed distance from center
            const maxDistance = Math.min(section.width, section.height) * FOOD_BOUNDS_THRESHOLD;
            
            // Calculate flow force towards center
            if (distance > 0) {
                // Apply stronger force if too far from center
                const flowStrength = distance > maxDistance ? FOOD_SUPER_PUSH_STRENGTH : FOOD_FLOW_STRENGTH;
                this.vx += (dx / distance) * flowStrength;
                this.vy += (dy / distance) * flowStrength;
            }
            
            // Add circular motion
            const time = Date.now() / 1000;
            this.vx += Math.sin(time + this.y * 0.05) * FOOD_CIRCULAR_STRENGTH;
            this.vy += Math.cos(time + this.x * 0.05) * FOOD_CIRCULAR_STRENGTH;
            
            // Add some randomness for natural movement
            this.vx += (Math.random() - 0.5) * FOOD_RANDOM_MOVEMENT;
            this.vy += (Math.random() - 0.5) * FOOD_RANDOM_MOVEMENT;
            
            // Dampen velocity for smooth movement
            this.vx *= FOOD_DAMPENING;
            this.vy *= FOOD_DAMPENING;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Check if food particle has exceeded lifetime
        if (this.isFood && Date.now() - this.createdAt > FOOD_LIFETIME) {
            this.merged = true;
            return;
        }

        // Enhanced boundary checks for food particles
        if (this.isFood) {
            // Check if any part of the triangle shape is out of bounds
            const size = this.radius * 5;
            let outOfBounds = false;
            
            // Check all three vertices of the triangle
            for (let i = 0; i < 3; i++) {
                const angle = (i * 2 * Math.PI / 3) - (Math.PI / 2);
                const vertexX = this.x + size * Math.cos(angle);
                const vertexY = this.y + size * Math.sin(angle);
                
                if (vertexX < section.x || vertexX > section.x + section.width ||
                    vertexY < section.y || vertexY > section.y + section.height) {
                    outOfBounds = true;
                    break;
                }
            }
            
            if (outOfBounds) {
                // Teleport to center if out of bounds
                this.x = section.x + section.width / 2;
                this.y = section.y + section.height / 2;
                
                // Apply strong push force toward center
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            // Regular boundary checks for non-food particles
            if (this.x - this.radius < section.x) {
                this.x = section.x + this.radius;
                this.vx *= -BOUNCE_FORCE;
            }
            if (this.x + this.radius > section.x + section.width) {
                this.x = section.x + section.width - this.radius;
                this.vx *= -BOUNCE_FORCE;
            }
            if (this.y - this.radius < section.y) {
                this.y = section.y + this.radius;
                this.vy *= -BOUNCE_FORCE;
            }
            if (this.y + this.radius > section.y + section.height) {
                this.y = section.y + section.height - this.radius;
                this.vy *= -BOUNCE_FORCE;
            }
        }
    }

    drawHexagon(ctx, x, y, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const xPos = x + radius * Math.cos(angle);
            const yPos = y + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        ctx.closePath();
    }

    drawDollarSign(ctx, x, y, size) {
        ctx.save();
        
        // Draw glow effect
        const glowSize = size * 2; // Larger glow for better visibility
        const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, glowSize
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw dollar sign
        ctx.translate(x, y);
        
        // Scale the size for better visibility
        const scaledSize = size * 1.5;
        
        ctx.beginPath();
        ctx.restore();
        ctx.fillStyle = this.color;
        ctx.font = size * 5 + "px monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw domain name
        ctx.fillText("$", x, y);

    }

    draw(ctx) {
        if (this.isFood) {
            if (USE_DOLLAR_SIGNS) {
                this.drawDollarSign(ctx, this.x, this.y, this.radius);
            } else {
                // Draw food particles as hollow triangles
                ctx.save();
                ctx.translate(this.x, this.y);
                
                ctx.beginPath();
                const size = this.radius * 2;
                // Draw an equilateral triangle
                for (let i = 0; i < 3; i++) {
                    const angle = (i * 2 * Math.PI / 3) - (Math.PI / 2); // Start from top
                    const xPos = size * Math.cos(angle);
                    const yPos = size * Math.sin(angle);
                    if (i === 0) {
                        ctx.moveTo(xPos, yPos);
                    } else {
                        ctx.lineTo(xPos, yPos);
                    }
                }
                ctx.closePath();
                
                // Stroke only for hollow effect
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        } else {
            // Draw glow effect
            if (this.glowIntensity > 0.1) {
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, this.radius,
                    this.x, this.y, this.radius * (1 + this.glowIntensity)
                );
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.drawHexagon(ctx, this.x, this.y, this.radius * (1 + this.glowIntensity));
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            
            // Draw main hexagon
            this.drawHexagon(ctx, this.x, this.y, this.radius);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Draw domain name and size if particle is large enough
            if (this.radius > DOMAIN_TEXT_THRESHOLD) {
                ctx.fillStyle = 'white';
                ctx.font = '18px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Draw domain name
                ctx.fillText(this.getBaseDomain(this.domain), this.x, this.y);
                // Draw size above domain
                //ctx.fillText(`Size: ${Math.round(this.radius)}`, this.x, this.y - 15);
            }
        }
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Initialize audio context and buffers
let audioContext;
let cashRegisterBuffer;
let eatingSynth;
// Flag to switch between sound types

// Initialize audio on user interaction
document.addEventListener('click', async () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Load cash register sound
        try {
            const response = await fetch('cash-register-kaching-sound-effect-125042.mp3');
            const arrayBuffer = await response.arrayBuffer();
            cashRegisterBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading cash register sound:', error);
        }
    }
    if (!eatingSynth && !USE_CASH_REGISTER) {
        await Tone.start();
        eatingSynth = new Tone.Synth({
            oscillator: {
                type: 'sawtooth8',
            },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0,
                release: 0.1
            }
        }).toDestination();
    }
});

// Keep track of last play time to prevent overlapping
let lastPlayTime = 0;
const MIN_PLAY_INTERVAL = 0.05; // Minimum time between sounds in seconds

// Function to create eating sound
function createEatingSound(baseFreq) {
    const now = USE_CASH_REGISTER ? audioContext?.currentTime : Tone.now();
    if (!now) return;
    
    // Ensure minimum time between triggers
    if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
        return;
    }
    lastPlayTime = now;
    
    if (USE_CASH_REGISTER && cashRegisterBuffer && audioContext) {
        // Create source and gain nodes
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = cashRegisterBuffer;
        
        // Vary playback rate based on baseFreq
        const baseRate = baseFreq / 200; // Normalize frequency to reasonable playback rate
        const variation = (Math.random() - 0.5) * 0.4; // ±0.2 variation
        source.playbackRate.value = Math.max(0.5, Math.min(2.0, baseRate + variation));
        
        // Randomize volume
        gainNode.gain.value = 0.3 + Math.random() * 0.2;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play sound
        source.start(0);
        return;
    }
    
    // Fallback to ToneJS if cash register sound isn't ready
    if (!USE_CASH_REGISTER && eatingSynth) {
        // Randomize frequency for this eat
        const startFreq = baseFreq + (Math.random() - 0.5) * 50;
        const endFreq = startFreq * 0.5 + (Math.random() - 0.5) * 30;
        
        // Randomize duration and volume
        const duration = 0.08 + Math.random() * 0.04;
        const volume = -12 + Math.random() * 4;
        
        // Schedule the sound
        eatingSynth.volume.value = volume;
        eatingSynth.triggerAttackRelease(startFreq, duration, now);
        eatingSynth.frequency.rampTo(endFreq, duration, now);
    }
}

class FluidVisualization {
    constructor() {
        this.canvas = document.createElement('canvas');
        document.getElementById('canvas-container').appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.particles = [];
        this.particleBuffer = [];
        this.domainColors = new Map();
        this.ipSections = new Map();
        this.stats = {
            totalPackets: 0,
            activeConnections: 0,
            activeScanners: 0,
            bufferedParticles: 0
        };

        // Batch processing settings
        this.batchSize = DEFAULT_BATCH_SIZE;
        this.batchInterval = BATCH_INTERVAL;
        this.lastBatchTime = Date.now();

        // Maximum particle size will be calculated per section
        this.maxParticleSizePercent = MAX_PARTICLE_SIZE_PERCENT;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.setupWebSocket();
        this.animate();
    }

    resize() {
        const container = document.getElementById('canvas-container');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Update canvas style to fill container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
    }

    getColorForDomain(domain) {
        const baseDomain = this.getBaseDomain(domain);
        if (!this.domainColors.has(baseDomain)) {
            const hue = Math.random() * 360;
            this.domainColors.set(baseDomain, `hsla(${hue}, ${PARTICLE_COLOR_SATURATION}, ${PARTICLE_COLOR_LIGHTNESS}, ${PARTICLE_COLOR_ALPHA}`);
        }
        return this.domainColors.get(baseDomain);
    }

    getBaseDomain(domain) {
        const parts = domain.split('.');
        // Always return just the last two parts (maindomain.tld)
        return parts.slice(-2).join('.');
    }

    createParticle(data) {
        // Add to buffer instead of creating immediately
        this.particleBuffer.push(data);
        this.stats.bufferedParticles = this.particleBuffer.length;
        this.updateStats();
    }

    processParticleBuffer() {
        const currentTime = Date.now();
        
        // Only process if we have enough time elapsed and particles in buffer
        if (currentTime - this.lastBatchTime < this.batchInterval || this.particleBuffer.length === 0) {
            return;
        }

        // Count current food particles
        const currentFoodCount = this.particles.filter(p => p.isFood).length;
        
        // If we're at max food capacity, don't process more
        if (currentFoodCount >= MAX_ACTIVE_FOOD) {
            return;
        }

        // Determine if we should batch based on buffer size
        const shouldBatch = this.particleBuffer.length > FOOD_BATCH_THRESHOLD;

        // Calculate how many new food particles we can add
        const availableSpace = MAX_ACTIVE_FOOD - currentFoodCount;
        
        // Determine batch size based on batching mode and available space
        let batchSize;
        if (shouldBatch) {
            // If batching, use default batch size
            batchSize = Math.min(this.batchSize, this.particleBuffer.length, availableSpace);
        } else {
            // If not batching, process one at a time
            batchSize = Math.min(1, this.particleBuffer.length, availableSpace);
        }

        // Group particles by domain
        const domainGroups = new Map();
        const batch = this.particleBuffer.splice(0, batchSize);
        
        batch.forEach(data => {
            const domain = data.domain;
            const bytes = data.bytes || 1000;
            if (!domainGroups.has(domain)) {
                domainGroups.set(domain, {
                    data: data,
                    count: 1,
                    totalBytes: bytes
                });
            } else {
                const group = domainGroups.get(domain);
                group.count++;
                group.totalBytes += bytes;
            }
        });

        // Create particles for each domain group
        domainGroups.forEach((group, domain) => {
            const combinedData = {
                ...group.data,
                bytes: group.totalBytes,
                combinedCount: group.count
            };
            this.createParticleImmediate(combinedData);
        });

        this.lastBatchTime = currentTime;
        this.stats.bufferedParticles = this.particleBuffer.length;
        this.updateStats();
    }

    createParticleImmediate(data) {
        const domain = data.domain;
        const bytes = data.bytes || 1000;
        
        // Scale radius using logarithmic scale for more dramatic size differences
        const combinedCount = data.combinedCount || 1;
        const bytesLog = Math.log2(bytes);
        const countLog = Math.log2(combinedCount + 1);
        const baseRadius = Math.min(Math.max(bytesLog * 3, 5), 20); // Increased multiplier and max size
        const radius = baseRadius * Math.min(countLog + 1, 8); // Use log scale for count scaling too
        
        const source = data.source || '192.168.1.1';
        
        // Only process IPs in 192.168.1.0/24 range
        if (!source.startsWith('192.168.1.')) {
            return;
        }

        // Extract the last octet to combine inbound/outbound for same IP
        const ipLastOctet = source.split('.')[3];
        const normalizedIP = `192.168.1.${ipLastOctet}`;
        
        // Get or create section for this IP
        if (!this.ipSections.has(normalizedIP)) {
            const currentSize = this.ipSections.size;
            
            // If this is the first IP, use the full window
            if (true) {
                this.ipSections.set(normalizedIP, {
                    x: 0,
                    y: 0,
                    width: this.width,
                    height: this.height,
                    targetX: 0,
                    targetY: 0,
                    targetWidth: this.width,
                    targetHeight: this.height
                });
            } else {
                // Calculate new dimensions for all sections including the new one
                const totalSections = currentSize + 1;
                const columns = Math.ceil(Math.sqrt(totalSections));
                const rows = Math.ceil(totalSections / columns);
                const sectionWidth = this.width / columns;
                const sectionHeight = this.height / rows;

                // Update existing sections with new target dimensions
                let idx = 0;
                this.ipSections.forEach((section) => {
                    const row = Math.floor(idx / columns);
                    const col = idx % columns;
                    
                    section.targetX = col * sectionWidth;
                    section.targetY = row * sectionHeight;
                    section.targetWidth = sectionWidth;
                    section.targetHeight = sectionHeight;
                    
                    // If first update, initialize current position to target
                    if (section.targetX === undefined) {
                        section.x = section.targetX;
                        section.y = section.targetY;
                        section.width = section.targetWidth;
                        section.height = section.targetHeight;
                    }
                    idx++;
                });

                // Add new section
                const newRow = Math.floor(currentSize / columns);
                const newCol = currentSize % columns;
                this.ipSections.set(normalizedIP, {
                    x: newCol * sectionWidth,
                    y: newRow * sectionHeight,
                    width: sectionWidth,
                    height: sectionHeight,
                    targetX: newCol * sectionWidth,
                    targetY: newRow * sectionHeight,
                    targetWidth: sectionWidth,
                    targetHeight: sectionHeight
                });
            }
            
            this.stats.activeScanners = this.ipSections.size;
        }
        
        const section = this.ipSections.get(normalizedIP);
        const x = section.x + Math.random() * section.width;
        const y = section.y + Math.random() * section.height;
        
        // Create a food particle for the new packet
        const foodParticle = new Particle(
            x, y, radius, domain,
            this.getColorForDomain(domain),
            true // isFood
        );
        
        this.particles.push(foodParticle);
        this.stats.totalPackets++;
        
        // Create a main orb if none exists for this domain in this section
        const existingOrb = this.particles.find(p => 
            !p.isFood && 
            p.baseDomain === foodParticle.baseDomain &&
            p.x >= section.x && p.x < section.x + section.width &&
            p.y >= section.y && p.y < section.y + section.height
        );
        
        if (!existingOrb) {
            const mainOrb = new Particle(
                x, y, radius * 3, domain, // Increased size multiplier for DNS blobs
                this.getColorForDomain(domain),
                false // isFood
            );
            this.particles.push(mainOrb);
        }
        
        this.stats.activeConnections = this.particles.filter(p => !p.isFood).length;
        this.updateStats();
    }

    mergePairs(pairs) {
        pairs.forEach(([p1, p2]) => {
            if (p1.merged || p2.merged) return;
            
            // Calculate center point of merged particle
            const newX = (p1.x + p2.x) / 2;
            const newY = (p1.y + p2.y) / 2;
            
            // Find which section this merged particle will be in
            const section = Array.from(this.ipSections.entries())
                .find(([_, s]) => 
                    newX >= s.x && newX < s.x + s.width && 
                    newY >= s.y && newY < s.y + s.height
                )[1];
            
            // Calculate max size based on section dimensions
            const sectionMaxSize = Math.min(section.width, section.height) * this.maxParticleSizePercent;
            
            // Calculate new radius using logarithmic scaling
            const combinedArea = Math.PI * (p1.radius * p1.radius + p2.radius * p2.radius);
            const logArea = Math.log2(combinedArea);
            const newRadius = Math.min(Math.sqrt(logArea) * 15, sectionMaxSize); // Increased multiplier for more dramatic scaling
            
            // Use the shorter domain name for display
            const displayDomain = p1.domain.length <= p2.domain.length ? p1.domain : p2.domain;
            const newParticle = new Particle(
                newX, newY, newRadius,
                displayDomain, p1.color
            );
            
            newParticle.vx = (p1.vx + p2.vx) / 2;
            newParticle.vy = (p1.vy + p2.vy) / 2;
            
            p1.merged = true;
            p2.merged = true;
            
            this.particles.push(newParticle);
        });

        this.particles = this.particles.filter(p => !p.merged);
        this.stats.activeConnections = this.particles.length;
        this.updateStats();
    }

    update() {
        // Process particle buffer
        this.processParticleBuffer();

        // Scale particles based on total count
        const nonFoodParticles = this.particles.filter(p => !p.isFood);
        if (nonFoodParticles.length > 10) {
            // Find the largest particle
            // Find the section for each particle and calculate max size based on section
            nonFoodParticles.forEach(p => {
                const sectionEntry = Array.from(this.ipSections.entries())
                    .find(([_, s]) => 
                        p.x >= s.x && p.x < s.x + s.width && 
                        p.y >= s.y && p.y < s.y + s.height
                    );
        
                // Add null check before accessing [1]
                if (!sectionEntry) {
                    console.warn('No matching section found for particle:', p);
                    return; // Skip this particle
                }
        
                const section = sectionEntry[1];
                // Max size is 60% of the smaller section dimension
                const sectionMaxSize = Math.min(section.width, section.height) * this.maxParticleSizePercent;
                
                // Find the largest particle in this section
                const sectionParticles = nonFoodParticles.filter(op => 
                    op.x >= section.x && op.x < section.x + section.width &&
                    op.y >= section.y && op.y < section.y + section.height
                );
                const maxRadius = Math.max(...sectionParticles.map(op => op.targetRadius));
                
                // Scale particle relative to largest in its section
                const scale = p.targetRadius / maxRadius;
                p.targetRadius = Math.max(5, sectionMaxSize * scale * 0.8);
            });
        }

        // Update section positions with smooth transitions
        this.ipSections.forEach(section => {
            if (section.targetX !== undefined) {
                // Smooth transition for position and size
                section.x += (section.targetX - section.x) * SECTION_TRANSITION_SPEED;
                section.y += (section.targetY - section.y) * SECTION_TRANSITION_SPEED;
                section.width += (section.targetWidth - section.width) * SECTION_TRANSITION_SPEED;
                section.height += (section.targetHeight - section.height) * SECTION_TRANSITION_SPEED;
            }
        });

        // Find pairs to merge
        const pairs = [];

            // Update particles and check collisions
            this.particles.forEach(p => {
                // Find the section this particle belongs to
                const sectionEntry = Array.from(this.ipSections.entries())
                    .find(([_, s]) => 
                        p.x >= s.x && p.x < s.x + s.width && 
                        p.y >= s.y && p.y < s.y + s.height
                    );
                
                // If particle is outside all sections, remove it and its associated food
                if (!sectionEntry) {
                    p.merged = true;
                    // If this is a main orb, also remove its food particles
                    if (!p.isFood) {
                        this.particles.forEach(food => {
                            if (food.isFood && food.baseDomain === p.baseDomain) {
                                food.merged = true;
                            }
                        });
                    }
                    return;
                }
                
                const section = sectionEntry[1];
                p.update(this.width, this.height, section, this.particles);
            
            // Apply collision response with other particles
            this.particles.forEach(other => {
                if (p === other) return;
                
                const dx = other.x - p.x;
                const dy = other.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = p.radius + other.radius + 1;
                
                if (distance < minDistance) {
                    // Calculate collision response
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const percent = overlap / distance / 2;
                    const offsetX = dx * percent;
                    const offsetY = dy * percent;
                    
                    // Handle food particles differently from orbs
                    if (p.isFood !== other.isFood) {
                        const food = p.isFood ? p : other;
                        const orb = p.isFood ? other : p;
                        
                        if (food.baseDomain === orb.baseDomain) {
                            // Immediately remove the food particle
                            const foodIndex = this.particles.indexOf(food);
                            if (foodIndex !== -1) {
                                this.particles.splice(foodIndex, 1);
                            }
                            
                            // Find the section for the orb
                            const section = Array.from(this.ipSections.entries())
                                .find(([_, s]) => 
                                    orb.x >= s.x && orb.x < s.x + s.width && 
                                    orb.y >= s.y && orb.y < s.y + s.height
                                )[1];
                            
                            // Calculate max size based on section dimensions
                            const sectionMaxSize = Math.min(section.width, section.height) * this.maxParticleSizePercent;
                            
                            // Grow the orb and add effects
                            const growth = food.radius * 0.5;
                            orb.targetRadius = Math.min(orb.radius + growth, sectionMaxSize);
                            orb.glowIntensity = Math.min(orb.glowIntensity + 0.5, 1);
                            orb.lastFed = Date.now();
                            
                            // Play eating sound with this blob's base frequency
                            createEatingSound(orb.baseFrequency);
                            
                            // Skip further collision processing for this pair
                            return;
                        } else {
                            // Enhanced expulsion for food colliding with different domain orbs
                            const bounceForce = 1; // Increased bounce force
                            food.vx = -food.vx * bounceForce;
                            food.vy = -food.vy * bounceForce;
                            
                            // Stronger push force to ensure expulsion
                            const pushForce = Math.max(3, minDistance - distance);
                            const normalizedDx = dx / distance;
                            const normalizedDy = dy / distance;
                            
                            // Move food outside the orb's radius
                            food.x = orb.x - (normalizedDx * (minDistance + 1));
                            food.y = orb.y - (normalizedDy * (minDistance + 1));
                            
                            // Add some randomness to prevent food from getting stuck
                            food.vx += (Math.random() - 0.5) * 2;
                            food.vy += (Math.random() - 0.5) * 2;
                        }
                    } else {
                        // Enhanced collision response with momentum
                        const mass1 = p.radius * p.radius;
                        const mass2 = other.radius * other.radius;
                        const totalMass = mass1 + mass2;
                        
                        // Separate particles
                        if (!p.isFood) {
                            p.x -= offsetX;
                            p.y -= offsetY;
                        }
                        if (!other.isFood) {
                            other.x += offsetX;
                            other.y += offsetY;
                        }
                        
                        // Calculate new velocities based on mass
                        const force = 0.008;
                        const p1Ratio = mass2 / totalMass;
                        const p2Ratio = mass1 / totalMass;
                        
                        p.vx -= dx * force * p1Ratio;
                        p.vy -= dy * force * p1Ratio;
                        other.vx += dx * force * p2Ratio;
                        other.vy += dy * force * p2Ratio;
                        
                        // Merge if both are orbs with same domain
                        if (!p.isFood && !other.isFood && p.baseDomain === other.baseDomain) {
                            pairs.push([p, other]);
                        }
                    }
                }
            });
        });

        // Merge found pairs
        if (pairs.length > 0) {
            this.mergePairs(pairs);
        }

        // Remove particles that are below REMOVAL_THRESHOLD and their associated food
        const particlesToRemove = new Set();
        
        // First pass: identify particles to remove
        this.particles.forEach(p => {
            if (!p.isFood && p.radius < REMOVAL_THRESHOLD) {
                particlesToRemove.add(p);
                // Find and mark associated food particles for removal
                this.particles.forEach(food => {
                    if (food.isFood && food.baseDomain === p.baseDomain) {
                        particlesToRemove.add(food);
                    }
                });
            }
        });
        
        // Second pass: filter out marked particles
        this.particles = this.particles.filter(p => !particlesToRemove.has(p));
    }

    drawCyberpunkBackground() {
        // Create gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(1, '#1a0033');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid
        const gridSize = 50;
        const time = Date.now() * 0.001;
        
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < this.width; x += gridSize) {
            const offset = Math.sin(time + x * 0.01) * 5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x + offset, this.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < this.height; y += gridSize) {
            const offset = Math.cos(time + y * 0.01) * 5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y + offset);
            this.ctx.stroke();
        }

        // Add some floating particles in the background
        for (let i = 0; i < 50; i++) {
            const x = (time * 20 + i * 100) % this.width;
            const y = (Math.sin(time + i) * 50 + i * 30) % this.height;
            const size = Math.sin(time * 2 + i) * 2 + 3;
            
            this.ctx.fillStyle = `rgba(0, ${150 + Math.sin(time + i) * 50}, ${200 + Math.cos(time + i) * 55}, 0.3)`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    draw() {
        // Draw cyberpunk background
        this.drawCyberpunkBackground();
        
        // Draw section boundaries with cyberpunk style
        this.ipSections.forEach(section => {
            // Glowing border effect
            const time = Date.now() * 0.001;
            const glowIntensity = Math.sin(time * 2) * 0.2 + 0.8;
            
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.2 * glowIntensity})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(section.x, section.y, section.width, section.height);
            
            // Inner border with different color
            this.ctx.strokeStyle = `rgba(255, 0, 255, ${0.1 * glowIntensity})`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(section.x + 2, section.y + 2, section.width - 4, section.height - 4);
            
            // Draw IP address with cyberpunk style
            this.ctx.fillStyle = `rgba(0, 255, 255, ${0.7 * glowIntensity})`;
            this.ctx.font = '12px "Courier New", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(Array.from(this.ipSections.keys())[Array.from(this.ipSections.values()).indexOf(section)], 
                section.x + 10, section.y + 10);
        });
        
        this.particles.forEach(p => p.draw(this.ctx));
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    updateStats() {
        const statsEl = document.getElementById('stats');
        const activeIPs = Array.from(this.ipSections.keys()).join('<br>');
        const foodCount = this.particles.filter(p => p.isFood).length;
        const isBatching = this.particleBuffer.length > FOOD_BATCH_THRESHOLD;
        
        statsEl.innerHTML = `
            Total Packets: ${this.stats.totalPackets}<br>
            Active Connections: ${this.stats.activeConnections}<br>
            Active Scanners: ${this.stats.activeScanners}<br>
            Buffered Particles: ${this.stats.bufferedParticles}<br>
            Food Particles: ${foodCount}/${MAX_ACTIVE_FOOD}<br>
            Batching: ${isBatching ? 'Active' : 'Inactive'}<br>
            <br>
            Active IPs:<br>
            ${activeIPs}
        `;
    }

    setupWebSocket() {
        const socket = io();

        socket.on('event', (data) => {
            //console.log('Received event:', data);
            if (data.type === 'dns_query' || data.type === 'traffic') {
                this.createParticle(data);
            }
        });

        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }
}

// Global error handlers to catch unhandled errors and force reload
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', {
        message: msg,
        url: url,
        line: lineNo,
        column: columnNo,
        error: error
    });
    
    // Force reload after a short delay
    setTimeout(() => {
        console.log('Reloading page due to error...');
        //window.location.reload();
    }, 1000);
    
    return false; // Let the error propagate
};

// Handle unhandled promise rejections
window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Force reload after a short delay
    setTimeout(() => {
        console.log('Reloading page due to unhandled promise rejection...');
        //window.location.reload();
    }, 1000);
};

// Initialize visualization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing fluid visualization...');
    new FluidVisualization();
});
