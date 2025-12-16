# 👩‍💻 Portfólio de Thamiris Calixto - Desenvolvedora Júnior

Este é o código-fonte de um portfólio moderno e responsivo, construído com **HTML5**, **Tailwind CSS** e **JavaScript** puro, com um foco especial em **Acessibilidade** (Dark Mode, Alto Contraste, Text-to-Speech).

## 🗂️ Estrutura de Arquivos

* `index.html`: Estrutura principal do portfólio.
* `style.css`: Arquivo CSS final, contendo as classes do Tailwind e os estilos de Alto Contraste.
* `script.js`: Toda a lógica JavaScript, incluindo a manipulação do DOM, Dark Mode, animações e o Assistente Virtual (com lógica de TTS usando a API do Google Gemini).
* `tailwind.config.js`: Arquivo de configuração do Tailwind CSS (para cores customizadas).

## 🚀 Como Executar Localmente

1.  **Clone o Repositório:**
    ```bash
    git clone [link do seu repositório]
    cd [pasta do projeto]
    ```

2.  **Abra o `index.html`:**
    Basta abrir o arquivo `index.html` no seu navegador de preferência.

### 🛠️ Configuração Adicional (Para Desenvolvimento)

Se você planeja modificar o código-fonte do Tailwind:

1.  **Instale o Node.js e o npm.**
2.  **Instale o Tailwind CSS e o PostCSS:**
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
3.  **Use o `tailwind.config.js`** fornecido neste projeto para a configuração de cores.
4.  **Execute o Tailwind Watcher:**
    ```bash
    npx tailwindcss -i ./src/input.css -o ./style.css --watch
    ```
    *(Presume-se que você tenha um arquivo `input.css` na pasta `src/` que contenha as diretivas `@tailwind`)*.

### 🔊 Aviso sobre Text-to-Speech (TTS)

O recurso de "Ler Página em Voz Alta (TTS)" utiliza a API do Google Gemini para conversão de texto em áudio de alta qualidade.

**Para que o TTS funcione, você precisa:**

1.  Obter uma **Chave de API** do Google AI Studio ou Google Cloud.
2.  Colocar sua chave na constante `API_KEY` dentro do arquivo `script.js`:
    ```javascript
    const API_KEY = "SUA_CHAVE_API_AQUI"; // Substitua por sua chave
    ```
    *Sem a chave, a funcionalidade de leitura em voz alta resultará em um erro de conexão.*