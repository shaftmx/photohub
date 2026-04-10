# Official Playwright image — Node + Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /tests

# Skip browser download — browsers are already in the image
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json ./
RUN npm install

# Test sources are mounted at runtime via -v
ENTRYPOINT ["npx", "playwright", "test", "--config=/tests/playwright.config.ts"]
