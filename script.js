/**
 * Wedding Page Logic
 * Joaquín & Gabriela
 */

// CONFIGURATION
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLR1z5TJe_LN1y3VlL8l3tDRPSOs7Et1Jq2gxf7f53-fHLilKWVi7CjAp_s23mjpDU/exec'; // Updated by user later
const WEDDING_DATE = new Date('April 20, 2026 15:00:00').getTime();

// 0. UTILS
function parseFecha(str) {
    if (!str) return null;
    if (str instanceof Date) return str;

    // Si viene como string de Google Sheets DD/MM/YYYY
    const parts = str.toString().split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(str);
}

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
    btnEnter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
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
            loginError.innerText = data.message || 'Usuario no encontrado. Asegúrate de escribir tu nombre y apellido juntos.';
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if (err.name === 'AbortError') {
            loginError.innerText = 'La conexión tardó demasiado. Inténtalo de nuevo.';
        } else if (err.message === 'Failed to fetch') {
            loginError.innerText = 'No se pudo conectar con el servidor. Revisa tu conexión de internet.';
        } else {
            loginError.innerText = `Error: ${err.message}`;
        }
    } finally {
        btnEnter.disabled = false;
        usernameInput.disabled = false;
        btnEnter.innerText = 'Acceder a la invitación';
    }
}

function showMainContent(userData) {
    accessGate.classList.add('hidden');
    mainContent.classList.remove('hidden');

    // 1. Verificar Fecha Límite de Confirmación
    if (userData.fechaLimite) {
        const now = new Date();
        const deadline = parseFecha(userData.fechaLimite);

        // Si la fecha límite ya pasó
        if (deadline && now > deadline) {
            const rsvpSection = document.getElementById('rsvp');
            if (rsvpSection) {
                const rsvpContainer = rsvpSection.querySelector('.container');

                // Reemplazamos el formulario con el mensaje de "fuera de fecha"
                rsvpContainer.innerHTML = `
                    <div class="success-content" style="text-align: center; padding: 40px 0;">
                        <i class="fas fa-clock" style="font-size: 50px; color: #e74c3c; display:block; margin: 0 auto 20px;"></i>
                        <h2 style="color: var(--text-color); margin-bottom: 20px;">CONFIRMACIÓN CERRADA</h2>
                        <p style="font-size: 1.2rem; line-height: 1.6; color: #444;">
                            Ya no es posible confirmar su asistencia. <br>
                            Ya está fuera de fecha. <br>
                            Lamentamos que no pueda acompañarnos.
                        </p>
                    </div>
                `;
                console.log("Fecha límite superada:", deadline);
                // No retornamos para permitir ver el resto de la invitación
            }
        }
    }

    // Display dynamic passes information
    const passesContainer = document.getElementById('passes-container');
    const numPasesSpan = document.getElementById('num-pases');
    const listaInvitadosDiv = document.getElementById('lista-invitados');

    console.log("Datos recibidos del servidor:", userData);

    if (userData.Pases !== undefined && userData.Pases !== null) {
        passesContainer.classList.remove('hidden');
        numPasesSpan.innerText = `(${userData.Pases})`;

        if (userData.Invitados) {
            const lista = userData.Invitados.split(/[,\n]/).map(name => name.trim()).filter(name => name !== "");
            listaInvitadosDiv.innerHTML = lista.join('<br>');
        } else {
            listaInvitadosDiv.innerHTML = ""; // Clear if no names
        }
    } else {
        // En caso de que no haya datos de pases, nos aseguramos de que el contenedor esté oculto
        passesContainer.classList.add('hidden');
        console.warn("No se encontraron 'Pases' en los datos del usuario.");
    }

    console.log(`Bienvenido, ${userData.nombre}`);
    startCountdown();
    startMusic();
}

// Check if already logged in
const savedUserRaw = localStorage.getItem('wedding_user');
if (savedUserRaw) {
    const savedUser = JSON.parse(savedUserRaw);
    showMainContent(savedUser);

    // Si el usuario guardado no tiene fechaLimite (sesión antigua), refrescamos del servidor
    if (!savedUser.fechaLimite) {
        console.log("Refrescando sesión antigua para obtener fecha límite...");
        fetch(`${APP_SCRIPT_URL}?usuario=${encodeURIComponent(savedUser.usuario)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('wedding_user', JSON.stringify(data));
                    showMainContent(data);
                }
            }).catch(e => console.error("Error refrescando sesión:", e));
    }
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
function copyText(elementId, btn) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
        btn.style.borderColor = '#27ae60';
        btn.style.color = '#27ae60';

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    });
}

// 8. Custom Form Validation Messages in Spanish
document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.oninvalid = function (e) {
            e.target.setCustomValidity("");
            if (!e.target.validity.valid) {
                if (e.target.type === 'radio') {
                    e.target.setCustomValidity("Por favor, selecciona una opción.");
                } else {
                    e.target.setCustomValidity("Por favor, completa este campo.");
                }
            }
        };
        input.oninput = function (e) {
            e.target.setCustomValidity("");
        };
    });
});

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
            const isAttending = data.confirmado === 'Si';
            const rsvpForm = document.getElementById('rsvp-form');

            if (isAttending) {
                rsvpForm.innerHTML = `
                    <div class="success-content">
                        <span class="success-message-text">Gracias por hacer tus arreglos y poder disfrutar con nosotros este momento tan especial.</span>
                        <i class="fas fa-check-circle" style="font-size: 50px; color: #27ae60; display:block; margin: 20px auto;"></i>
                        <p>Tu asistencia ha sido confirmada.</p>
                    </div>
                `;
                // Move calendar button
                const calendarBtn = document.getElementById('btn-add-calendar');
                if (calendarBtn) {
                    calendarBtn.style.display = 'inline-flex';
                    if (calendarBtn.parentNode) calendarBtn.parentNode.removeChild(calendarBtn);
                    document.querySelector('.success-content').appendChild(calendarBtn);
                }
            } else {
                rsvpForm.innerHTML = `
                    <div class="success-content">
                        <span class="success-message-text">Lamentamos tu decisión, pero a la vez la comprendemos. Gracias por confirmar.</span>
                        <i class="fas fa-heart" style="font-size: 50px; color: #e74c3c; display:block; margin: 20px auto;"></i>
                    </div>
                `;
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
            // Add interaction listener only after login and if autoplay failed
            const playOnInteraction = () => {
                if (isMusicPlaying === false && bgMusic.paused) {
                    bgMusic.play().then(() => {
                        isMusicPlaying = true;
                        musicBtn.classList.add('playing');
                        musicBtn.innerHTML = `
                            <div class="music-waves">
                                <span></span><span></span><span></span>
                            </div>
                            <i class="fas fa-pause" style="position: relative; z-index: 2;"></i>
                        `;
                    }).catch(e => { });
                }
            };
            window.addEventListener('click', playOnInteraction, { once: true });
            window.addEventListener('touchstart', playOnInteraction, { once: true });
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
