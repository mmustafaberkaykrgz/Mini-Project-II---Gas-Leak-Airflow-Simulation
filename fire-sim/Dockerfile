FROM node:20-alpine

# Çalışma dizini
WORKDIR /app

# Bağımlılık dosyalarını kopyala
COPY package.json package-lock.json* ./

# Bağımlılıkları yükle
RUN npm install

# Uygulama kodunu kopyala
COPY . .

# Vite varsayılan portu
EXPOSE 5173

# Vite geliştirme sunucusunu başlat
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]


