FROM node

# 1. Создаём пользователя redirects с домашней папкой /home/redirects
RUN useradd -m -s /bin/sh redirects

# 2. Переключаемся на пользователя redirects
USER redirects

# 3. Указываем путь к рабочей папке
WORKDIR /home/redirects

# 4. Копируем файлы с владельцем redirects
COPY --chown=redirects:redirects package*.json ./

# 5. Ставим зависимости NPM от имени пользователя redirects
RUN npm install

# 6. Копируем остальной код с владельцем redirects
COPY --chown=redirects:redirects index.js ./

# 7. Запуск приложения от имени пользователя redirects
CMD ["node", "index.js"]
