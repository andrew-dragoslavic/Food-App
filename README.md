# Voice Food Ordering System 🎤🍕

A revolutionary voice-activated food ordering application that allows users to order food from delivery services using natural speech commands, without ever opening a food delivery app.

## 🌟 What It Does

Simply speak to your device: *"Order a Big Mac from McDonald's"* and the system will:
- Convert your speech to text
- Understand your intent using AI
- Automatically log into your DoorDash account
- Search for the restaurant and item
- Add items to your cart
- Present you with a ready-to-confirm checkout page

**No clicking, no typing, no app switching required.**

## 🚀 Key Features

### Current MVP Features
- **Voice Recognition**: Browser-based speech-to-text conversion
- **Natural Language Understanding**: AI-powered command parsing using Google Gemini
- **Secure Authentication**: Firebase-based user management
- **Automated Web Scraping**: Puppeteer-driven DoorDash automation
- **Secure Credential Storage**: Encrypted storage of delivery service credentials
- **Voice Feedback**: Text-to-speech progress updates

### Planned Features
- **Multi-Service Support**: Integration with Uber Eats, Grubhub, and other platforms
- **Price Comparison**: Automatic comparison across multiple services
- **Full Automation**: Complete order placement with payment processing
- **Order History**: Track and reorder previous purchases
- **Voice Conversation**: Natural dialogue for order customization

## 🛠️ Technology Stack

### Frontend
- **React.js**: User interface and component management
- **Web Speech API**: Browser-native speech recognition and synthesis
- **Firebase Auth**: Secure user authentication

### Backend
- **Node.js/Express**: RESTful API server
- **Puppeteer**: Headless browser automation
- **Google Gemini API**: Natural language processing
- **MongoDB**: User data and credential storage
- **bcrypt**: Password encryption and security

### Infrastructure
- **Firebase**: Authentication and hosting
- **Git/GitHub**: Version control and collaboration

## 🏗️ System Architecture

```
User Voice Input
    ↓
Speech-to-Text (Browser)
    ↓
React Frontend
    ↓
Express.js API
    ↓
Google Gemini (Intent Parsing)
    ↓
Puppeteer (Web Automation)
    ↓
DoorDash/Food Service
    ↓
Checkout Page (User Confirmation)
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Google Cloud account (for Gemini API)
- MongoDB database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voice-food-ordering.git
   cd voice-food-ordering
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` files in both frontend and backend directories:
   
   **Backend `.env`:**
   ```
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json
   ENCRYPTION_KEY=your_encryption_key
   ```
   
   **Frontend `.env`:**
   ```
   REACT_APP_FIREBASE_CONFIG=your_firebase_config
   REACT_APP_API_URL=http://localhost:5000
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

## 📱 Usage

1. **Register/Login**: Create an account or log in to your existing account
2. **Add Credentials**: Securely save your DoorDash login credentials in your profile
3. **Voice Command**: Click the microphone button and speak your order
   - Format: "Order [item] from [restaurant]"
   - Example: "Order a pepperoni pizza from Domino's"
4. **Confirmation**: Review the prepared cart and complete your order

## 🔒 Security Features

- **Encrypted Credential Storage**: All delivery service passwords are encrypted using industry-standard encryption
- **Firebase Authentication**: Secure user management with token-based authentication
- **API Rate Limiting**: Protection against abuse and automated attacks
- **Secure Session Management**: Automatic session expiry and secure token handling

## 📋 Development Roadmap

### Sprint 0: Foundation ✅
- Project setup and basic infrastructure
- Frontend-backend connectivity

### Sprint 1: Authentication ✅
- User registration and login
- Protected routes and profile management

### Sprint 2: Voice Interface ✅
- Speech-to-text integration
- Text-to-speech feedback system

### Sprint 3: AI Understanding ✅
- Google Gemini integration
- Natural language command parsing

### Sprint 4: Web Automation ✅
- Puppeteer implementation
- DoorDash login automation

### Sprint 5: MVP Integration ✅
- End-to-end voice ordering flow
- Complete system integration

### Future Sprints 🔄
- [ ] Multi-service support (Uber Eats, Grubhub)
- [ ] Price comparison engine
- [ ] Full payment automation
- [ ] Mobile app development
- [ ] Voice conversation improvements
- [ ] Order history and favorites

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run integration tests
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration for code style
- Write tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PRs

## ⚠️ Legal Considerations

This project automates interactions with third-party services. Please ensure compliance with:
- Terms of Service of food delivery platforms
- Web scraping best practices and rate limiting
- Data privacy regulations (GDPR, CCPA)
- User consent for credential storage

## 🐛 Known Issues

- Browser compatibility limited to Chrome/Firefox for Speech API
- Occasional captcha challenges on delivery services
- Network latency may affect voice recognition accuracy

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/voice-food-ordering/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/voice-food-ordering/discussions)
- **Email**: support@voicefoodordering.com

## 🙏 Acknowledgments

- Google Gemini for natural language processing
- Puppeteer team for web automation capabilities
- Firebase for authentication infrastructure
- Open source community for various libraries and tools

---

**⚡ Quick Start**: Want to see it in action? Check out our [demo video](link-to-demo) or try the [live demo](link-to-live-demo).

**🌟 Star this repo** if you find it useful!
