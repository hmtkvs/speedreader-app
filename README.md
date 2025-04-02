# SpeedReader

A modern, web-based speed reading application that helps you read faster with advanced techniques. This tool makes it easier to consume text content at higher speeds while maintaining comprehension.

![SpeedReader Screenshot](https://github.com/hmtkvs/speedreader-app/assets/placeholder-image.png)

## 🚀 Features

- **Adjustable Reading Speed**: Control your Words Per Minute (WPM) rate
- **Multiple Words View**: Read multiple words at once to increase speed
- **PDF Support**: Upload and read PDFs directly in the app
- **Text Pasting**: Paste any text to read quickly
- **Customizable Interface**: Choose color schemes, fonts, and text size
- **Progress Tracking**: View reading statistics and track improvement
- **Translation Features**: Get instant translations of selected words
- **Text-to-Speech**: Listen to text with adjustable voices and speed
- **Fullscreen Mode**: Distraction-free reading experience
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Animation**: Framer Motion
- **PDF Processing**: PDF.js
- **Backend/Auth**: Supabase
- **Text Processing**: Custom algorithms
- **Analytics**: GA4 and Sentry
- **Payments**: Stripe

## 🔧 Local Development

```bash
# Clone the repository
git clone https://github.com/hmtkvs/speedreader-app.git
cd speedreader-app

# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
/
├── public/             # Static files
├── src/
│   ├── components/     # UI components
│   ├── models/         # Data models
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions and services
│   ├── monitoring.ts   # Monitoring and error tracking
│   └── main.tsx        # Application entry point
├── supabase/           # Supabase configuration and schema
└── vite.config.ts      # Vite configuration
```

## 🔒 Environment Setup

This application requires several environment variables. See `.env.example` for all required variables.

## 🆕 Recent Updates

- Fixed security vulnerabilities in dependencies
- Updated Vite to version 6.2.4
- Fixed environment variable handling for Vite 6
- Resolved duplicate key issues in PDF processing
- Added TypeScript declaration file for environment variables

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Contact

Project Link: [https://github.com/hmtkvs/speedreader-app](https://github.com/hmtkvs/speedreader-app)