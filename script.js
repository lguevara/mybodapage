/**
 * Wedding Page Logic
 * Joaquín & Gabriela
 */

// CONFIGURATION
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfE4LnlsvMQH3QDOUm1g_7ZmNx9q1DYR7DRZgemJGCBJq0ILyn5bMnQelHAbkz_R53/exec'; // Updated by user later
const WEDDING_DATE = new Date('April 20, 2026 15:00:00').getTime();

// Elements
const accessGate = document.getElementById('access-gate');
const mainContent = document.getElementById('main-content');
const usernameInput = document.getElementById('username-input');
const btnEnter = document.getElementById('btn-enter');
const loginError = document.getElementById('login-error');
const rsvpForm = document.getElementById('rsvp-form');
const msgForm = document.getElementById('message-form');
const songsContainer = document.getElementById('songs-container');
const bgMusic = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-control');
let isMusicPlaying = false;

// 1. AUTHENTICATION LOGIC
btnEnter.addEventListener('click', validateUser);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validateUser();
});

async function validateUser() {
    const user = usernameInput.value.trim();
    if (!user) return;

    // Loading State
    btnEnter.disabled = true;
    usernameInput.disabled = true;
    btnEnter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
    loginError.innerText = '';

    try {
        if (APP_SCRIPT_URL.includes('DEBES_COLOCAR')) {
            console.warn('Apps Script URL not set. Using mock validation.');
            showMainContent({ nombre: user, usuario: user });
            return;
        }

        // Use a timeout to detect if Google is taking too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${APP_SCRIPT_URL}?usuario=${encodeURIComponent(user)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Servidor respondió con estado: ${response.status}`);
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Response was not JSON:', text);
            throw new Error('La respuesta del servidor no es válida.');
        }

        if (data.success) {
            localStorage.setItem('wedding_user', JSON.stringify(data));
            showMainContent(data);
        } else {
            loginError.innerText = data.message || 'Usuario no encontrado.';
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if (err.name === 'AbortError') {
            loginError.innerText = 'La conexión tardó demasiado. Inténtalo de nuevo.';
        } else if (err.message === 'Failed to fetch') {
            loginError.innerText = 'No se pudo conectar con el servidor. Revisa tu conexión o vuelve al Walkthrough para revisar el Apps Script.';
        } else {
            loginError.innerText = `Error: ${err.message}`;
        }
    } finally {
        btnEnter.disabled = false;
        usernameInput.disabled = false;
        btnEnter.innerText = 'Ingresar';
    }
}

function showMainContent(userData) {
    accessGate.classList.add('hidden');
    mainContent.classList.remove('hidden');
    // Personalize welcome if needed
    console.log(`Bienvenido, ${userData.nombre}`);
    startCountdown();
    startMusic();
}

// Check if already logged in
const savedUser = localStorage.getItem('wedding_user');
if (savedUser) {
    showMainContent(JSON.parse(savedUser));
}

// 2. COUNTDOWN TIMER
function startCountdown() {
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = WEDDING_DATE - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = days.toString().padStart(2, '0');
        document.getElementById('hours').innerText = hours.toString().padStart(2, '0');
        document.getElementById('minutes').innerText = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').innerText = seconds.toString().padStart(2, '0');

        if (distance < 0) {
            clearInterval(timer);
            document.getElementById('countdown').innerHTML = "<h3>¡Hoy es el gran día!</h3>";
        }
    }, 1000);
}

// 3. RSVP LOGIC (Songs field visibility)
document.querySelectorAll('input[name="attending"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'Si') {
            songsContainer.classList.remove('hidden');
        } else {
            songsContainer.classList.add('hidden');
        }
    });
});

// 4. FORM SUBMISSIONS
rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(rsvpForm);
    const user = JSON.parse(localStorage.getItem('wedding_user')).usuario;

    const payload = {
        usuario: user,
        confirmado: formData.get('attending'),
        canciones: formData.get('songs') || ''
    };

    await sendToSheet(payload, 'rsvp', rsvpForm.querySelector('button[type="submit"]'));
});

msgForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(msgForm);
    const user = JSON.parse(localStorage.getItem('wedding_user')).usuario;

    const payload = {
        usuario: user,
        mensaje: formData.get('guest_message')
    };

    await sendToSheet(payload, 'message', msgForm.querySelector('button[type="submit"]'));
});

// 5. FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;
        item.classList.toggle('active');
    });
});

// 6. Copy to clipboard
function copyText(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('Copiado: ' + text);
    });
}

// 7. Scroll Animations (Reveal on Scroll)
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // Optional: observer.unobserve(entry.target); // If you want it to animate only once
        }
    });
}, {
    threshold: 0.15
});

revealElements.forEach(el => revealObserver.observe(el));

// 8. Photo Carousel Logic
const carouselSlide = document.querySelector('.carousel-slide');
const carouselImages = document.querySelectorAll('.carousel-slide img');
const prevBtn = document.querySelector('#prevBtn');
const nextBtn = document.querySelector('#nextBtn');
const carouselContainer = document.querySelector('.carousel-container');

// Progress Bar
const progressBar = document.createElement('div');
progressBar.classList.add('carousel-progress-bar');
carouselContainer.appendChild(progressBar);

let counter = 0;
let carouselTimer;
const AUTO_ROTATE_TIME = 15000; // 15 seconds

function updateCarouselView() {
    const size = carouselSlide.clientWidth;
    carouselSlide.style.transform = 'translateX(' + (-size * counter) + 'px)';
}

function startCarouselCycle() {
    // 1. Clear any existing timer
    if (carouselTimer) clearTimeout(carouselTimer);

    // 2. Reset Progress Bar (Instant)
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';

    // 3. Force Reflow/Repaint so the browser registers width=0
    void progressBar.offsetWidth;

    // 4. Start Animation to 100%
    requestAnimationFrame(() => {
        progressBar.style.transition = `width ${AUTO_ROTATE_TIME}ms linear`;
        progressBar.style.width = '100%';
    });

    // 5. Set Timer for Next Slide
    carouselTimer = setTimeout(() => {
        moveNext();
    }, AUTO_ROTATE_TIME);
}

function moveNext() {
    if (counter >= carouselImages.length - 1) counter = -1;
    counter++;
    updateCarouselView();
    startCarouselCycle(); // Continue loop
}

function movePrev() {
    if (counter <= 0) counter = carouselImages.length;
    counter--;
    updateCarouselView();
    startCarouselCycle(); // Restart loop
}

// Initial start
window.addEventListener('load', () => {
    updateCarouselView();
    startCarouselCycle();
});

nextBtn.addEventListener('click', moveNext);
prevBtn.addEventListener('click', movePrev);

// Handle resize (Simplified to avoid transition issues, but keeps it responsive)
window.addEventListener('resize', () => {
    const size = carouselSlide.clientWidth;
    // Temporarily disable transition
    carouselSlide.style.transition = 'none';
    carouselSlide.style.transform = 'translateX(' + (-size * counter) + 'px)';
    // Re-enable
    setTimeout(() => {
        carouselSlide.style.transition = 'transform 0.5s ease-in-out';
    }, 50);
});

// 7. Add to Calendar (Updated Logic)
// Listener remains, but we might move the button in DOM dynamically.
document.getElementById('btn-add-calendar').addEventListener('click', () => {
    const title = "Boda Joaquín & Gabriela";
    const details = "¡Nos casamos! Acompáñanos en este día especial.";
    const location = "Salón del Reino de los Testigos de Jehová, Chiclayo";
    const startDate = "20260420T150000";
    const endDate = "20260421T000000";

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&dates=${startDate}/${endDate}`;

    window.open(calendarUrl, '_blank');
});

// Update sendToSheet to handle Loading and Success showing Calendar
async function sendToSheet(data, formType, btn) {
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const savedUser = JSON.parse(localStorage.getItem('wedding_user'));

    // Payload
    const payload = {
        usuario: savedUser ? savedUser.usuario : 'Invitado', // Fallback
        ...data // 'confirmado' or 'mensaje'
    };

    try {
        const response = await fetch(APP_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for simple POST to Apps Script Web App
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Since no-cors returns opaque response, we assume success if no network error
        // Simulating delay for "processing" feel
        await new Promise(r => setTimeout(r, 1500));

        if (formType === 'rsvp') {
            // Hide form, show success with calendar
            const rsvpForm = document.getElementById('rsvp-form');
            rsvpForm.innerHTML = `
                <div class="success-content">
                    <span class="success-message-text">Gracias por hacer tus arreglos y poder disfrutar con nosotros este momento tan especial.</span>
                    <i class="fas fa-check-circle" style="font-size: 50px; color: #27ae60; display:block; margin: 20px auto;"></i>
                    <p>Tu asistencia ha sido confirmada.</p>
                </div>
            `;
            // Move calendar button here if it exists (it behaves as a singleton)
            const calendarBtn = document.getElementById('btn-add-calendar');
            if (calendarBtn) {
                calendarBtn.style.display = 'inline-flex'; // Make visible
                // Remove it from footer to avoid duplication or errors if we clone
                if (calendarBtn.parentNode) calendarBtn.parentNode.removeChild(calendarBtn);
                document.querySelector('.success-content').appendChild(calendarBtn);
            }
        } else {
            document.getElementById('message-form').reset();
            btn.innerText = '¡Mensaje Enviado!';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerText = originalText;
            }, 3000);
        }

    } catch (err) {
        console.error('Post error:', err);
        alert('Hubo un error al enviar. Por favor intenta denuevo.');
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// 9. Background Music Logic

function startMusic() {
    if (!bgMusic || !musicBtn) return;

    // Show control
    musicBtn.classList.remove('hidden');
    musicBtn.innerHTML = '<i class="fas fa-play"></i>'; // Default state

    // Attempt play
    bgMusic.volume = 0.5; // Start at 50%

    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            isMusicPlaying = true;
            musicBtn.classList.add('playing');
            musicBtn.innerHTML = `
                <div class="music-waves">
                    <span></span><span></span><span></span>
                </div>
                <i class="fas fa-pause" style="position: relative; z-index: 2;"></i>
            `;
        }).catch(err => {
            console.log('Autoplay prevented by browser, waiting for user interaction');
            isMusicPlaying = false;
            // Button already shows Play icon, user can click it
        });
    }
}

function toggleMusic() {
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
        musicBtn.classList.remove('playing');
        musicBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        bgMusic.play();
        isMusicPlaying = true;
        musicBtn.classList.add('playing');
        musicBtn.innerHTML = `
            <div class="music-waves">
                <span></span><span></span><span></span>
            </div>
            <i class="fas fa-pause" style="position: relative; z-index: 2;"></i>
        `;
    }
}

if (musicBtn) {
    musicBtn.addEventListener('click', toggleMusic);
}
