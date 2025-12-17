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

        
    

// --- ROTAÇÃO DE TEXTOS NA SEÇÃO SOBRE MIM ---

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

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadCvNav');

    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = 'ThamirisCalixtoDev.pdf'; // caminho do PDF
        link.download = 'ThamirisCalixtoDev.pdf';       // nome do arquivo
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
