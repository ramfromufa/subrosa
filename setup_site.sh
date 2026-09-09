#!/bin/bash

###############################################################################
# Bash скрипт для настройки Nginx сайта с TLS (Let's Encrypt)
# Использование: sudo ./setup_site.sh
###############################################################################

set -e  # Выход при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции для вывода
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

###############################################################################
# ПРОВЕРКИ
###############################################################################

# Проверка прав суперпользователя
if [[ $EUID -ne 0 ]]; then
    log_error "Этот скрипт должен быть запущен с правами sudo"
    exit 1
fi

# Проверка ОС
if ! grep -qi debian /etc/os-release && ! grep -qi ubuntu /etc/os-release; then
    log_error "Этот скрипт работает только на Debian/Ubuntu"
    exit 1
fi

log_info "Начало установки и настройки сайта..."

###############################################################################
# ПОЛУЧЕНИЕ ВХОДНЫХ ДАННЫХ
###############################################################################

read -p "Введите домен сайта (например, example.com): " DOMAIN

# Валидация домена
if [[ ! $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    log_error "Некорректный формат домена"
    exit 1
fi

LINUX_USER="${SUDO_USER:-$(whoami)}"

# Проверка существования пользователя
if ! id "$LINUX_USER" &>/dev/null; then
    log_error "Пользователь $LINUX_USER не существует"
    exit 1
fi

# Путь к сайту
SITE_PATH="/home/$LINUX_USER/subrosa"
PUBLIC_PATH="$SITE_PATH/publ"
USER_HOME="/home/$LINUX_USER"

# Проверка существования сайта
if [ ! -d "$SITE_PATH" ]; then
    log_error "Директория $SITE_PATH не найдена"
    exit 1
fi

if [ ! -d "$PUBLIC_PATH" ]; then
    log_error "Директория $PUBLIC_PATH не найдена"
    exit 1
fi

if [ ! -f "$PUBLIC_PATH/index.html" ]; then
    log_error "Файл $PUBLIC_PATH/index.html не найден"
    exit 1
fi

log_info "Домен: $DOMAIN"
log_info "Пользователь: $LINUX_USER"
log_info "Путь сайта: $SITE_PATH"
log_info "Публичная папка: $PUBLIC_PATH"

###############################################################################
# УСТАНОВКА НЕОБХОДИМЫХ ПАКЕТОВ
###############################################################################

log_info "Обновление системы..."
apt-get update -qq
apt-get upgrade -y -qq

###############################################################################
# FIREWALL (UFW)
###############################################################################

log_info "Настройка firewall (UFW)..."

# Проверка установлен ли UFW
if ! command -v ufw &> /dev/null; then
    log_warn "UFW не установлен, пропускаю настройку firewall"
else
    # Включение UFW
    ufw --force enable

    # Разрешение SSH (важно!)
    ufw allow 22/tcp comment "SSH"

    # Разрешение HTTP и HTTPS
    ufw allow 80/tcp comment "HTTP"
    ufw allow 443/tcp comment "HTTPS"

    log_info "Firewall настроен"
fi

log_info "Установка Nginx и Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

# Запуск Nginx
systemctl enable nginx
systemctl start nginx

###############################################################################
# СОЗДАНИЕ ВРЕМЕННЫХ ДИРЕКТОРИЙ
###############################################################################

log_info "Создание временных директорий для certbot..."
mkdir -p /var/www/certbot/.well-known/acme-challenge

###############################################################################
# СОЗДАНИЕ ВРЕМЕННОЙ КОНФИГУРАЦИИ NGINX (только для HTTP)
###############################################################################

log_info "Создание временной конфигурации Nginx для получения сертификата..."

NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

# Временная конфигурация - только HTTP для ACME challenge
cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    # Разрешить ACME challenge для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Остальное - редирект на HTTPS (после получения сертификата)
    location / {
        root PUBLIC_PATH_PLACEHOLDER;
        index index.html index.htm;
        try_files $uri $uri/ /index.html =404;
    }
}
EOF

# Замена плейсхолдеров
sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN|g" "$NGINX_CONFIG"
sed -i "s|PUBLIC_PATH_PLACEHOLDER|$PUBLIC_PATH|g" "$NGINX_CONFIG"

# Включение сайта
if [ ! -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    ln -s "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
fi

# Удаление дефолтного сайта
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Проверка и перезагрузка
log_info "Проверка и применение временной конфигурации Nginx..."
if ! nginx -t; then
    log_error "Ошибка в конфигурации Nginx!"
    exit 1
fi

systemctl reload nginx

###############################################################################
# НАСТРОЙКА CERTBOT И TLS
###############################################################################

log_info "Получение SSL сертификата от Let's Encrypt для $DOMAIN..."

certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --agree-tos \
    --non-interactive \
    --email "admin@$DOMAIN" \
    --expand

if [ $? -ne 0 ]; then
    log_error "Ошибка при получении сертификата"
    exit 1
fi

log_info "Сертификат успешно получен!"

###############################################################################
# СОЗДАНИЕ ФИНАЛЬНОЙ КОНФИГУРАЦИИ NGINX (с HTTPS)
###############################################################################

log_info "Создание окончательной конфигурации Nginx с HTTPS..."

cat > "$NGINX_CONFIG" << 'EOF'
# Перенаправление HTTP на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    # Разрешить только ACME challenge для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Все остальное перенаправлять на HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name DOMAIN_PLACEHOLDER;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

    # Безопасные настройки SSL/TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Безопасность заголовков
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Отключить доступ к скрытым файлам
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Основной корневой каталог - только публичная папка
    root PUBLIC_PATH_PLACEHOLDER;
    index index.html index.htm;

    # Попытка добраться до файлов вне publ/ - блокируем
    location ~ ^/\.\./ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Основная локация для всех запросов
    location / {
        # Попробуй файл, если нет - используй index.html (для SPA)
        try_files $uri $uri/ /index.html =404;

        # Настройки для статических файлов
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Кэширование для статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Логирование
    access_log /var/log/nginx/DOMAIN_PLACEHOLDER_access.log combined;
    error_log /var/log/nginx/DOMAIN_PLACEHOLDER_error.log warn;

    # Защита от больших запросов
    client_max_body_size 10m;

    # Таймауты
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
EOF

# Замена плейсхолдеров
sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN|g" "$NGINX_CONFIG"
sed -i "s|PUBLIC_PATH_PLACEHOLDER|$PUBLIC_PATH|g" "$NGINX_CONFIG"

###############################################################################
# ПРИМЕНЕНИЕ ФИНАЛЬНОЙ КОНФИГУРАЦИИ
###############################################################################

log_info "Проверка финальной конфигурации Nginx..."
if ! nginx -t; then
    log_error "Ошибка в конфигурации Nginx!"
    exit 1
fi

log_info "Перезагрузка Nginx с финальной конфигурацией..."
systemctl reload nginx

###############################################################################
# АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СЕРТИФИКАТА
###############################################################################

log_info "Настройка автоматического обновления сертификата..."

# Создание скрипта для автоматического обновления
RENEWAL_SCRIPT="/usr/local/bin/renew-cert-$DOMAIN.sh"

cat > "$RENEWAL_SCRIPT" << 'RENEWAL_EOF'
#!/bin/bash
certbot renew --quiet --no-self-upgrade
systemctl reload nginx
RENEWAL_EOF

chmod +x "$RENEWAL_SCRIPT"

# Добавление в crontab (проверка обновления каждый день в 2:30 AM)
CRON_JOB="30 2 * * * $RENEWAL_SCRIPT"

# Проверка, есть ли уже эта задача
if ! crontab -l 2>/dev/null | grep -q "renew-cert-$DOMAIN"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_info "Задача cron добавлена для автоматического обновления сертификата"
fi

###############################################################################
# НАСТРОЙКИ БЕЗОПАСНОСТИ ФАЙЛОВОЙ СИСТЕМЫ
###############################################################################

log_info "Настройка прав доступа..."

# ВАЖНО: Дать права на родительскую директорию www-data
chmod 755 "$USER_HOME"

# www-data должна быть владельцем публичной папки и её содержимого
chown -R www-data:www-data "$PUBLIC_PATH"
chmod 755 "$SITE_PATH"
chmod 755 "$PUBLIC_PATH"
find "$PUBLIC_PATH" -type f -exec chmod 644 {} \;
find "$PUBLIC_PATH" -type d -exec chmod 755 {} \;

# Запрет доступа к непублично папкам на уровне ОС
for dir in "$SITE_PATH"/*; do
    if [ -d "$dir" ] && [ "$(basename "$dir")" != "publ" ]; then
        chmod 700 "$dir"
    fi
done

log_info "Права доступа установлены"

###############################################################################
# ЗАВЕРШЕНИЕ
###############################################################################

log_info "=================================================="
log_info "✓ Установка завершена успешно!"
log_info "=================================================="
log_info "Домен: https://$DOMAIN"
log_info "Путь сайта: $SITE_PATH"
log_info "Публичная папка: $PUBLIC_PATH"
log_info "Конфиг Nginx: $NGINX_CONFIG"
log_info "SSL сертификат: /etc/letsencrypt/live/$DOMAIN/"
log_info "=================================================="
log_info ""
log_info "Полезные команды:"
log_info "  Проверка статуса Nginx: systemctl status nginx"
log_info "  Просмотр логов: tail -f /var/log/nginx/${DOMAIN}_access.log"
log_info "  Ошибки: tail -f /var/log/nginx/${DOMAIN}_error.log"
log_info "  Обновить сертификат вручную: certbot renew"
log_info "  Просмотр задач cron: crontab -l"
log_info ""
log_info "Сайт должен быть доступен по: https://$DOMAIN"
log_info "=================================================="
