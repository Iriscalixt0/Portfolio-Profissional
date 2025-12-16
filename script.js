// Inicializa os ícones do Lucide
        lucide.createIcons();

        // Lógica do Dark/Light Mode
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;

        // Variável global para o player de áudio TTS
        let currentAudio = null;
        const API_KEY = ""; // Chave API (deixada em branco, será fornecida pelo ambiente)

 
        // Função para aplicar o tema
        function applyTheme(theme) {
            if (theme === 'dark') {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            // Garante que o modo de alto contraste é desativado ao mudar o tema padrão
            if (!document.body.classList.contains('high-contrast')) {
                 document.body.classList.remove('high-contrast');
            }
        }

        // Verifica a preferência do usuário ou o armazenamento local ao carregar
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (systemPrefersDark) {
            applyTheme('dark');
        } else {
            applyTheme('light'); 
        }

        // Alternar o tema ao clicar no botão
        themeToggle.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                applyTheme('light');
            } else {
                applyTheme('dark');
            }
        });

        // Adiciona um evento para scroll suave
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Função para iniciar as animações de entrada após a página carregar
        function setupAnimations() {
            const animatedElements = document.querySelectorAll('.animate-fade-in-up');
            
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = 1; 
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }); 

            animatedElements.forEach(element => {
                element.style.opacity = 0; 
                observer.observe(element);
            });
        }

        // --- Lógica de Acessibilidade (Alto Contraste e Font Size) ---
        let baseFontSize = 100; // Porcentagem do tamanho padrão (em %)

        function applyFontSize() {
            document.documentElement.style.fontSize = `${baseFontSize}%`;
        }
        
        function toggleHighContrast() {
            const body = document.body;
            const isHighContrast = body.classList.toggle('high-contrast');
            
            // Se o modo alto contraste foi ativado, desativamos o modo dark/light visualmente
            if (isHighContrast) {
                // Remove classes que podem interferir drasticamente
                html.classList.remove('dark', 'light');
            } else {
                // Volta para o tema definido no localStorage
                applyTheme(localStorage.getItem('theme') || 'light');
            }

            const message = isHighContrast ? 
                "Modo de Alto Contraste ativado (Preto/Amarelo/Ciano). Clique novamente para desativar." :
                "Modo de Alto Contraste desativado. Retornando ao tema original.";
            appendAssistantMessage(message);
        }

        function changeTextSize(delta) {
            baseFontSize = Math.max(80, Math.min(150, baseFontSize + delta)); // Limita entre 80% e 150%
            applyFontSize();
            appendAssistantMessage(`Tamanho do texto ajustado para ${baseFontSize}%.`);
        }
        
        // --- FUNÇÕES DE UTILIDADE PARA TTS (CONVERSÃO PCM -> WAV) ---

        /** Converte string base64 em ArrayBuffer. */
        function base64ToArrayBuffer(base64) {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }

        /** Escreve uma string no DataView para o cabeçalho WAV. */
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }

        /** Converte o buffer PCM (assinado 16-bit) para um Blob WAV. */
        function pcmToWav(pcm16, sampleRate = 24000) { 
            const numChannels = 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
            const blockAlign = numChannels * (bitsPerSample / 8);
            
            const buffer = new ArrayBuffer(44 + pcm16.length * 2); // 44 bytes para cabeçalho + dados
            const view = new DataView(buffer);
            
            // Chunk RIFF
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + pcm16.length * 2, true); 
            writeString(view, 8, 'WAVE');
            
            // Chunk fmt
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true); 
            view.setUint16(20, 1, true); // Áudio PCM
            view.setUint16(22, numChannels, true); 
            view.setUint32(24, sampleRate, true); 
            view.setUint32(28, byteRate, true); 
            view.setUint16(32, blockAlign, true); 
            view.setUint16(34, bitsPerSample, true); 
            
            // Chunk data
            writeString(view, 36, 'data');
            view.setUint32(40, pcm16.length * 2, true); 
            
            // Escreve os dados PCM
            let offset = 44;
            for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(offset, pcm16[i], true); // Signed 16-bit little-endian
                offset += 2;
            }
            
            return new Blob([view], { type: 'audio/wav' });
        }


        // --- LÓGICA DE TEXT-TO-SPEECH (TTS) ---

        /** Raspa o conteúdo de texto visível da página principal. */
        function scrapeVisibleText() {
            // Seletores para elementos de texto importantes
            const selectors = 'h2, h3, h4, p, a.nav-link, button:not(#assistantButton):not(.action-element)';
            const elements = document.querySelectorAll(selectors);
            let text = [];
            
            elements.forEach(el => {
                // Ignorar elementos dentro do modal da assistente e o botão de currículo
                if (el.closest('#assistantModal') || el.id === 'downloadCvNav') return;
                
                let elText = el.textContent.trim();
                
                // Limitar texto e ignorar números puros (como contadores)
                if (elText && !/^\d+[\+\%]?$/.test(elText)) {
                     // Adiciona uma pausa (ponto) entre as seções/elementos
                     text.push(elText);
                }
            });

            let fullText = text.join('. ');
            
            // Limitar o texto final para caber no payload da API (aprox 3000 caracteres)
            if (fullText.length > 3000) {
                fullText = fullText.substring(0, 3000) + "... (O conteúdo da página foi truncado para garantir a leitura)";
            }
            
            // Instrução para o modelo Gemini TTS
            const systemInstruction = "Você é um assistente de leitura. Leia o texto a seguir em português do Brasil, com um tom informativo, claro e motivador. Utilize a voz 'Kore'.";
            return { text: fullText, systemInstruction: systemInstruction };
        }


        /** Lida com a chamada da API TTS e a reprodução de áudio. */
        async function readPageContent() {
            const assistantBody = document.getElementById('assistantBody');
            const loadingId = 'tts-loading';
            
            // 1. Lógica de Parada (se o áudio estiver tocando)
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.src = '';
                currentAudio = null;
                appendAssistantMessage("Leitura interrompida pelo usuário.");
                showAccessibilityActions(); // Atualiza o botão para "Ler Página"
                return; 
            }

            // 2. Raspar e validar conteúdo
            const { text, systemInstruction } = scrapeVisibleText();
            if (!text.trim()) {
                appendAssistantMessage("Não foi possível encontrar conteúdo de texto significativo para ler.");
                return;
            }
            
            // 3. Mostrar indicador de carregamento
            const loadingMessage = document.createElement('div');
            loadingMessage.id = loadingId;
            loadingMessage.className = 'mb-3 p-3 bg-amber-100 dark:bg-amber-900 rounded-lg shadow-sm text-amber-800 dark:text-amber-200 text-sm font-bold';
            loadingMessage.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 inline-block align-middle animate-spin"></i> Gerando áudio... Aguarde.`;
            assistantBody.appendChild(loadingMessage);
            lucide.createIcons();
            assistantBody.scrollTop = assistantBody.scrollHeight;

            // 4. Configuração da API
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;
            
            const payload = {
                contents: [{ parts: [{ text: text }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
                },
                systemInstruction: { parts: [{ text: systemInstruction }] },
                model: "gemini-2.5-flash-preview-tts"
            };

            let response;
            try {
                // 5. Implementação de Exponential Backoff
                const maxRetries = 3;
                let delay = 1000;
                
                for (let i = 0; i < maxRetries; i++) {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) break; 

                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; 
                    } else {
                        throw new Error(`API falhou após ${maxRetries} tentativas.`);
                    }
                }
                
                const result = await response.json();
                const part = result?.candidates?.[0]?.content?.parts?.[0];
                const audioData = part?.inlineData?.data;
                const mimeType = part?.inlineData?.mimeType; 

                document.getElementById(loadingId)?.remove();

                if (audioData && mimeType && mimeType.startsWith("audio/")) {
                    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
                    
                    const pcmData = base64ToArrayBuffer(audioData);
                    const pcm16 = new Int16Array(pcmData);
                    
                    const wavBlob = pcmToWav(pcm16, sampleRate);
                    const audioUrl = URL.createObjectURL(wavBlob);
                    
                    // Inicia a reprodução
                    currentAudio = new Audio(audioUrl);
                    currentAudio.play();
                    
                    appendAssistantMessage(`▶️ Iniciando leitura do conteúdo da página. (Clique novamente em 'Parar Leitura' para interromper).`);
                    showAccessibilityActions(); // Atualiza o botão para "Parar Leitura"
                    
                    // Limpeza ao finalizar
                    currentAudio.onended = () => {
                        currentAudio = null;
                        URL.revokeObjectURL(audioUrl);
                        appendAssistantMessage("Leitura concluída.");
                        showAccessibilityActions();
                    };

                } else {
                    throw new Error("Resposta de áudio inválida ou incompleta.");
                }

            } catch (error) {
                document.getElementById(loadingId)?.remove();
                console.error("Erro ao gerar ou reproduzir áudio:", error);
                appendAssistantMessage(`❌ Erro ao ler: Verifique sua conexão ou tente novamente.`);
                currentAudio = null;
                showAccessibilityActions();
            }
        }

        // --- Lógica da Assistente Virtual (Chat) ---

        /**
         * Adiciona uma mensagem de texto no corpo do chat.
         * @param {string} message - O texto da mensagem.
         */
        function appendAssistantMessage(message) {
            const assistantBody = document.getElementById('assistantBody');
            const messageDiv = document.createElement('div');
            // Usamos a classe 'assistant-message' para diferenciar das actions
            messageDiv.className = 'mb-3 p-3 bg-indigo-50 dark:bg-slate-700 rounded-lg shadow-sm text-slate-800 dark:text-slate-200 assistant-message';
            messageDiv.textContent = message;
            assistantBody.appendChild(messageDiv);
            assistantBody.scrollTop = assistantBody.scrollHeight; // Scroll para o final
        }
        
        // Função para limpar ações dinâmicas da lista
        const clearDynamicActions = () => {
            const assistantBody = document.getElementById('assistantBody');
            let actionElements = assistantBody.querySelectorAll('.action-element');
            actionElements.forEach(el => el.remove());
        };

        /**
         * Exibe os botões de ação do Menu Principal (Download CV e Acessibilidade).
         */
        function showMainActions() {
            clearDynamicActions();
            
            // Adiciona a mensagem inicial apenas se ela não estiver lá (ou se estiver vazia)
            const bodyContent = document.getElementById('assistantBody').textContent.trim();
            if (!bodyContent.includes("Selecione uma opção:")) {
                appendAssistantMessage("Selecione uma opção: Baixar Currículo ou Opções de Acessibilidade.");
            }

            const mainOptions = [
                { text: 'Baixar Currículo (CV)', action: "handleAssistantAction('download')", icon: 'download-cloud', color: 'bg-green-600 hover:bg-green-700' },
                { text: 'Opções de Acessibilidade', action: "handleAssistantAction('accessibility')", icon: 'eye', color: 'bg-indigo-600 hover:bg-indigo-700' }
            ];

            mainOptions.forEach(opt => {
                const button = document.createElement('button');
                button.className = `action-element block w-full text-center mt-2 py-2 text-white rounded-md transition text-sm font-semibold shadow-md ${opt.color}`;
                button.innerHTML = `<i data-lucide="${opt.icon}" class="w-4 h-4 mr-2 inline-block align-middle"></i> ${opt.text}`;
                button.onclick = () => { handleAssistantAction(opt.action.match(/'([^']*)'/)[1]); }; 
                document.getElementById('assistantBody').appendChild(button);
            });
            lucide.createIcons();
            document.getElementById('assistantBody').scrollTop = document.getElementById('assistantBody').scrollHeight;
        }

        /**
         * Exibe os botões de ação do Menu de Acessibilidade.
         */
        function showAccessibilityActions() {
            clearDynamicActions();
            appendAssistantMessage("Selecione a ferramenta de acessibilidade que você precisa:");
                
            const accOptions = [
                // Novo botão de TTS. O texto e ícone mudam se o áudio estiver tocando.
                { 
                    text: currentAudio ? '⏹️ Parar Leitura (TTS)' : '🔊 Ler Página em Voz Alta (TTS)', 
                    action: "readPageContent()", 
                    icon: currentAudio ? 'square' : 'volume-2' 
                },
                { text: 'Aumentar Texto ( + )', action: "changeTextSize(10)", icon: 'zoom-in' },
                { text: 'Diminuir Texto ( - )', action: "changeTextSize(-10)", icon: 'zoom-out' },
                { text: 'Alto Contraste (ON/OFF)', action: "toggleHighContrast()", icon: 'sun-moon' },
                { text: 'Navegação Rápida', action: "showQuickNav()", icon: 'map' },
                { text: 'Voltar ao Menu Principal', action: "showMainActions()", icon: 'arrow-left' }
            ];

            accOptions.forEach(opt => {
                const button = document.createElement('button');
                button.className = 'action-element block w-full text-left mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm flex items-center';
                button.innerHTML = `<i data-lucide="${opt.icon}" class="w-4 h-4 mr-2 text-primary-dark dark:text-primary-light"></i> ${opt.text}`;
                
                // Mapeamento das ações
                if (opt.action === "readPageContent()") {
                    button.onclick = () => { readPageContent(); }; 
                } else if (opt.action === "changeTextSize(10)") {
                    button.onclick = () => { changeTextSize(10); showAccessibilityActions(); };
                } else if (opt.action === "changeTextSize(-10)") {
                    button.onclick = () => { changeTextSize(-10); showAccessibilityActions(); };
                } else if (opt.action === "toggleHighContrast()") {
                    button.onclick = () => { toggleHighContrast(); showAccessibilityActions(); };
                } else if (opt.action === "showQuickNav()") {
                    button.onclick = () => { showQuickNav(); };
                } else if (opt.action === "showMainActions()") {
                    button.onclick = () => { showMainActions(); };
                }
                document.getElementById('assistantBody').appendChild(button);
            });
            lucide.createIcons();
            document.getElementById('assistantBody').scrollTop = document.getElementById('assistantBody').scrollHeight;
        }


        function showQuickNav() {
            clearDynamicActions();
            appendAssistantMessage("Selecione a seção para onde deseja pular:");

            const navLinks = [
                { text: 'Contadores', id: 'contadores' },
                { text: 'Serviços', id: 'servicos' },
                { text: 'Habilidades', id: 'habilidades' },
                { text: 'Projetos', id: 'projetos' },
                { text: 'Jornada', id: 'timeline' },
                { text: 'Depoimentos', id: 'depoimentos' }
            ];

            navLinks.forEach(link => {
                const button = document.createElement('button');
                button.className = 'action-element block w-full text-left mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm flex items-center';
                button.innerHTML = `<i data-lucide="arrow-right-circle" class="w-4 h-4 mr-2 text-primary-dark dark:text-primary-light"></i> ${link.text}`;
                button.onclick = () => {
                    document.getElementById(link.id).scrollIntoView({ behavior: 'smooth' });
                    appendAssistantMessage(`Navegando para a seção: ${link.text}.`);
                    showAccessibilityActions(); // Volta para o menu de acessibilidade após a navegação
                    lucide.createIcons(); 
                };
                document.getElementById('assistantBody').appendChild(button);
            });
            
            // Botão Voltar
            const backButton = document.createElement('button');
            backButton.className = 'action-element block w-full text-center mt-3 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition text-sm font-semibold';
            backButton.innerHTML = `<i data-lucide="arrow-left" class="w-4 h-4 mr-2 inline-block align-middle"></i> Voltar para Acessibilidade`;
            backButton.onclick = () => { showAccessibilityActions(); };
            document.getElementById('assistantBody').appendChild(backButton);

            lucide.createIcons();
            document.getElementById('assistantBody').scrollTop = document.getElementById('assistantBody').scrollHeight;
        }
        
        /**
         * Lógica principal para manipular as ações.
         */
        function handleAssistantAction(action) {
            if (action === 'download') {
                clearDynamicActions();
                appendAssistantMessage("Currículo (CV) pronto! Clique abaixo para simular o download.");
                
                const downloadLink = document.createElement('a');
                downloadLink.href = '#'; 
                downloadLink.className = 'action-element block mt-3 text-center py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold';
                downloadLink.textContent = 'Baixar Currículo (PDF)';
                downloadLink.onclick = () => { 
                    alert('Download simulado! Em uma aplicação real, o CV seria baixado agora.');
                    showMainActions(); // Volta ao menu principal
                    return false; 
                };
                document.getElementById('assistantBody').appendChild(downloadLink);
            } else if (action === 'accessibility') {
                showAccessibilityActions();
            }
        }


        window.addEventListener('load', () => {
            setupAnimations();

            // Configuração e Eventos da Assistente Virtual
            const assistantButton = document.getElementById('assistantButton');
            const assistantModal = document.getElementById('assistantModal');
            
            // Função para alternar o estado visual do modal
            function toggleAssistantModal(show) {
                if (show) {
                    assistantModal.classList.remove('hidden', 'scale-95', 'opacity-0');
                    assistantModal.classList.add('scale-100', 'opacity-100');
                    // Mensagem de boas-vindas na primeira abertura
                    if (document.getElementById('assistantBody').children.length === 0) {
                         appendAssistantMessage("Olá! Sou sua Assistente Virtual de Acessibilidade. Posso ajudar você com ferramentas visuais e navegação rápida.");
                         showMainActions();
                    }
                } else {
                    assistantModal.classList.remove('scale-100', 'opacity-100');
                    assistantModal.classList.add('scale-95', 'opacity-0', 'hidden');
                    // Garante que o áudio pare se o modal for fechado
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.src = '';
                        currentAudio = null;
                        showAccessibilityActions(); 
                    }
                }
            }


            // 1. Lógica do Botão de Download na Nav Bar
            document.getElementById('downloadCvNav').addEventListener('click', (e) => {
                e.preventDefault();
                alert('Download do Currículo simulado!');
            });
            
            // 2. Lógica do Toggle da Assistente
            assistantButton.addEventListener('click', () => {
                const isHidden = assistantModal.classList.contains('hidden');
                toggleAssistantModal(isHidden);
            });
            
            // 3. Lógica para Abertura Automática da Assistente (Primeira Visita)
            const hasVisitedBefore = localStorage.getItem('hasVisitedPortfolio');
            if (!hasVisitedBefore) {
                // Abre o modal automaticamente com um pequeno atraso
                setTimeout(() => {
                    toggleAssistantModal(true);
                    localStorage.setItem('hasVisitedPortfolio', 'true');
                }, 1000); 
            }
        });

        // Localize o elemento h2 pelo ID
const textRotator = document.getElementById('text-rotator');
// Lista de textos que você deseja exibir
const texts = [
    "Desenvolvedora Full Stack",
    "Analista de Sistemas",
    "Desenvolvedora Júnior/Estagiária",
    "Especialista em Front-end" // Adicione quantos quiser
];

let index = 0;

function rotateText() {
    // 1. Aplica o efeito de fade-out (deixa o texto invisível)
    textRotator.style.opacity = '0';
    
    // 2. Espera um pouco (tempo da transição) para trocar o texto
    setTimeout(() => {
        // Troca o texto
        textRotator.textContent = texts[index];
        // Atualiza o índice para o próximo texto (roda em loop)
        index = (index + 1) % texts.length;
        
        // 3. Aplica o efeito de fade-in (mostra o novo texto)
        textRotator.style.opacity = '1';

    }, 500); // 500ms (0.5s) deve ser o tempo da sua transição CSS

}

// Inicia a rotação após 3 segundos para que o usuário leia o primeiro texto
setTimeout(() => {
    // Troca o texto a cada 5 segundos (5000ms)
    setInterval(rotateText, 5000); 
}, 3000); // Começa após 3s