# Tira Time

Aplicação web estática para cadastrar jogadores de futebol e sortear times equilibrados de forma rápida, visual e responsiva.

## Funcionalidades

- Cadastro de jogadores com nome, nota de 1 a 5 em estrelas e marcação de goleiro.
- Edição, exclusão, busca, ordenação e limpeza da lista.
- Modo rápido para colar vários nomes, um por linha, usando nota padrão 3.
- Sorteio de times com número de times, jogadores por time, reservas e distribuição de goleiros.
- Algoritmo de equilíbrio baseado na soma das notas de cada time.
- Indicador de equilíbrio: muito equilibrado, equilibrado ou pouco equilibrado.
- Cards de times com jogadores, goleiros destacados, soma e média das notas.
- Cópia do resultado em texto.
- Compartilhamento de cada time como imagem em uma quadra de futsal.
- Tema claro/escuro.
- Persistência em `localStorage`.
- Exportação e importação de jogadores em JSON.

## Como usar

1. Abra o arquivo `index.html` no navegador.
2. Cadastre os jogadores informando nome, nota e se é goleiro.
3. Ajuste o número de times e a quantidade de jogadores por time.
4. Clique em **Sortear times**.
5. Use **Copiar** para compartilhar o resultado em texto.
6. Use **Compartilhar imagem** para gerar uma imagem de um time em uma quadra de futsal.

## Como publicar no GitHub Pages

1. Envie os arquivos para um repositório no GitHub.
2. No GitHub, abra **Settings** do repositório.
3. Acesse **Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch principal, normalmente `main`, e a pasta `/root`.
6. Salve. O GitHub Pages publicará a aplicação em alguns minutos.

## Estrutura dos arquivos

```text
TiraTime/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Possíveis melhorias futuras

- Criar modelos de listas para diferentes grupos de jogadores.
- Permitir histórico de sorteios.
- Adicionar impressão do resultado.
- Gerar links compartilháveis com a escalação codificada.
- Permitir nomes personalizados para os times.
