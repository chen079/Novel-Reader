#!/bin/bash
set -e

# =============================================================================
#  Novel-Reader Production Deployment Script
#
#  Usage:
#    chmod +x run.sh
#    sudo ./run.sh deploy              # Full deployment (first time)
#    sudo ./run.sh deploy --domain example.com
#    sudo ./run.sh start | stop | restart | status
#    sudo ./run.sh nginx               # Regenerate nginx config only
#    sudo ./run.sh build               # Rebuild frontend only
#    sudo ./run.sh uninstall            # Remove services and nginx config
# =============================================================================

# ========================= Configuration =====================================
APP_NAME="novel-reader"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

DOMAIN="_"                      # Nginx server_name (_ = any, or set your domain)
HTTP_PORT=80                    # Nginx listen port
BACKEND_HOST="127.0.0.1"       # Backend bind address
BACKEND_PORT=8000               # Backend listen port
WORKERS=4                       # Gunicorn worker count
VENV_DIR="$BACKEND_DIR/venv"
SERVICE_NAME="$APP_NAME"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
NGINX_LINK="/etc/nginx/sites-enabled/$APP_NAME"
ENV_FILE="$BACKEND_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ========================= Helpers ===========================================

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

parse_args() {
    shift  # skip the subcommand
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --domain)   DOMAIN="$2";       shift 2 ;;
            --port)     HTTP_PORT="$2";    shift 2 ;;
            --workers)  WORKERS="$2";      shift 2 ;;
            --backend-port) BACKEND_PORT="$2"; shift 2 ;;
            *) warn "Unknown option: $1";  shift ;;
        esac
    done
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (sudo ./run.sh ...)"
    fi
}

# ========================= Dependency Checks =================================

check_deps() {
    info "Checking dependencies..."
    local missing=0

    # Python 3
    if command -v python3 &>/dev/null; then
        local pyver
        pyver=$(python3 --version 2>&1 | awk '{print $2}')
        success "Python $pyver"
    else
        warn "Python3 not found"
        missing=1
    fi

    # Node.js
    if command -v node &>/dev/null; then
        local nodever
        nodever=$(node --version 2>&1)
        success "Node.js $nodever"
    else
        warn "Node.js not found"
        missing=1
    fi

    # npm
    if command -v npm &>/dev/null; then
        success "npm $(npm --version 2>&1)"
    else
        warn "npm not found"
        missing=1
    fi

    # nginx
    if command -v nginx &>/dev/null; then
        success "nginx $(nginx -v 2>&1 | awk -F/ '{print $2}')"
    else
        warn "nginx not found"
        missing=1
    fi

    if [[ $missing -eq 1 ]]; then
        echo ""
        info "Install missing dependencies:"
        echo "  # Debian / Ubuntu:"
        echo "  apt update && apt install -y python3 python3-venv python3-pip nodejs npm nginx"
        echo ""
        echo "  # CentOS / RHEL:"
        echo "  yum install -y python3 python3-pip nodejs npm nginx"
        echo ""
        error "Please install the missing dependencies and re-run."
    fi

    success "All dependencies satisfied"
}

# ========================= Backend Setup =====================================

setup_backend() {
    info "Setting up backend..."

    # Create virtual environment if not exists
    if [[ ! -d "$VENV_DIR" ]]; then
        info "Creating Python virtual environment..."
        python3 -m venv "$VENV_DIR"
    fi
    success "Virtual environment ready"

    # Install / upgrade dependencies
    info "Installing Python dependencies..."
    "$VENV_DIR/bin/pip" install --upgrade pip -q
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q
    "$VENV_DIR/bin/pip" install gunicorn -q
    success "Python dependencies installed"

    # Generate .env file with SECRET_KEY if not exists
    if [[ ! -f "$ENV_FILE" ]]; then
        info "Generating production .env file..."
        local secret_key
        secret_key=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        cat > "$ENV_FILE" <<EOF
SECRET_KEY=$secret_key
EOF
        chmod 600 "$ENV_FILE"
        success "Generated .env with new SECRET_KEY"
    else
        success ".env file already exists, keeping existing config"
    fi

    # Ensure uploads directory exists
    mkdir -p "$BACKEND_DIR/uploads"
    success "Backend setup complete"
}

# ========================= Frontend Build ====================================

build_frontend() {
    info "Building frontend..."

    cd "$FRONTEND_DIR"

    # Install node modules if needed
    if [[ ! -d "node_modules" ]]; then
        info "Installing npm dependencies..."
        npm install --production=false
    fi

    # Build production bundle
    info "Running vite build..."
    npx vite build

    cd "$APP_DIR"
    success "Frontend build complete -> $FRONTEND_DIR/dist"
}

# ========================= Nginx Config ======================================

generate_nginx_config() {
    info "Generating nginx configuration..."

    local dist_dir="$FRONTEND_DIR/dist"

    if [[ ! -d "$dist_dir" ]]; then
        error "Frontend dist directory not found. Run './run.sh build' first."
    fi

    # Ensure sites-available and sites-enabled directories exist
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

    cat > "$NGINX_CONF" <<NGINX
# Novel-Reader - auto-generated by run.sh
# Domain: $DOMAIN  |  Port: $HTTP_PORT

server {
    listen ${HTTP_PORT};
    server_name ${DOMAIN};

    charset utf-8;
    client_max_body_size 20M;

    # Frontend static files
    root ${dist_dir};
    index index.html;

    # API reverse proxy
    location /api/ {
        proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    # Vue Router history mode - all non-file requests -> index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Deny dotfiles
    location ~ /\. {
        deny all;
    }
}
NGINX

    # Enable site
    ln -sf "$NGINX_CONF" "$NGINX_LINK"

    # Remove default site if it conflicts
    if [[ -f /etc/nginx/sites-enabled/default && "$HTTP_PORT" == "80" ]]; then
        warn "Removing default nginx site to avoid port 80 conflict"
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Test nginx config
    if nginx -t 2>&1; then
        success "Nginx configuration valid"
    else
        error "Nginx configuration test failed. Check $NGINX_CONF"
    fi

    success "Nginx config written to $NGINX_CONF"
}

# ========================= Systemd Service ===================================

create_systemd_service() {
    info "Creating systemd service..."

    cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE
[Unit]
Description=Novel-Reader Backend (Gunicorn + Uvicorn)
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/gunicorn app.main:app \\
    --workers ${WORKERS} \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind ${BACKEND_HOST}:${BACKEND_PORT} \\
    --access-logfile - \\
    --error-logfile - \\
    --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

    # Ensure www-data can access project files
    chown -R www-data:www-data "$BACKEND_DIR/uploads"
    chown www-data:www-data "$BACKEND_DIR/novel_reader.db" 2>/dev/null || true

    systemctl daemon-reload
    success "Systemd service created: ${SERVICE_NAME}.service"
}

# ========================= Commands ==========================================

do_deploy() {
    echo ""
    echo "========================================"
    echo "  Novel-Reader Production Deployment"
    echo "========================================"
    echo ""

    check_root
    check_deps
    setup_backend
    build_frontend
    generate_nginx_config
    create_systemd_service

    # Start services
    info "Starting services..."
    systemctl enable "$SERVICE_NAME" --now
    systemctl reload nginx

    echo ""
    echo "========================================"
    success "Deployment complete!"
    echo "========================================"
    echo ""
    echo "  Service:  systemctl status $SERVICE_NAME"
    echo "  Logs:     journalctl -u $SERVICE_NAME -f"
    echo ""
    if [[ "$DOMAIN" == "_" ]]; then
        echo "  URL:      http://<server-ip>:${HTTP_PORT}"
    else
        echo "  URL:      http://${DOMAIN}:${HTTP_PORT}"
    fi
    echo ""
    echo "  Manage:"
    echo "    sudo ./run.sh start | stop | restart | status"
    echo ""
}

do_start() {
    check_root
    info "Starting services..."
    systemctl start "$SERVICE_NAME"
    systemctl start nginx
    success "Services started"
}

do_stop() {
    check_root
    info "Stopping services..."
    systemctl stop "$SERVICE_NAME"
    success "Backend service stopped (nginx still running)"
}

do_restart() {
    check_root
    info "Restarting services..."
    systemctl restart "$SERVICE_NAME"
    systemctl reload nginx
    success "Services restarted"
}

do_status() {
    echo ""
    echo "=== Backend Service ==="
    systemctl status "$SERVICE_NAME" --no-pager -l 2>/dev/null || warn "Service not found"
    echo ""
    echo "=== Nginx ==="
    systemctl status nginx --no-pager -l 2>/dev/null || warn "Nginx not running"
    echo ""
}

do_nginx() {
    check_root
    generate_nginx_config
    systemctl reload nginx
    success "Nginx config regenerated and reloaded"
}

do_build() {
    build_frontend
}

do_uninstall() {
    check_root
    info "Uninstalling Novel-Reader services..."

    # Stop and disable service
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload

    # Remove nginx config
    rm -f "$NGINX_CONF" "$NGINX_LINK"
    systemctl reload nginx 2>/dev/null || true

    success "Services and nginx config removed"
    info "Project files at $APP_DIR are preserved"
}

show_help() {
    echo "Novel-Reader Deployment Script"
    echo ""
    echo "Usage: sudo ./run.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy      Full production deployment"
    echo "  start       Start backend service"
    echo "  stop        Stop backend service"
    echo "  restart     Restart backend + reload nginx"
    echo "  status      Show service status"
    echo "  nginx       Regenerate nginx config and reload"
    echo "  build       Rebuild frontend only"
    echo "  uninstall   Remove systemd service and nginx config"
    echo ""
    echo "Options (for deploy / nginx):"
    echo "  --domain <name>         Server domain (default: _ for any)"
    echo "  --port <num>            Nginx listen port (default: 80)"
    echo "  --backend-port <num>    Backend port (default: 8000)"
    echo "  --workers <num>         Gunicorn workers (default: 4)"
    echo ""
    echo "Examples:"
    echo "  sudo ./run.sh deploy"
    echo "  sudo ./run.sh deploy --domain reader.example.com --workers 2"
    echo "  sudo ./run.sh nginx --domain reader.example.com --port 8080"
    echo "  sudo ./run.sh restart"
}

# ========================= Main ==============================================

case "${1:-}" in
    deploy)
        parse_args "$@"
        do_deploy
        ;;
    start)    do_start ;;
    stop)     do_stop ;;
    restart)  do_restart ;;
    status)   do_status ;;
    nginx)
        parse_args "$@"
        do_nginx
        ;;
    build)    do_build ;;
    uninstall) do_uninstall ;;
    *)        show_help ;;
esac
