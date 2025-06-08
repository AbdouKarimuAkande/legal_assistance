
const { chromium } = require('playwright');

describe('LawHelp User Journey E2E Tests', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('User Registration and Authentication', () => {
    it('should complete full user registration flow', async () => {
      await page.goto('http://localhost:3000');
      
      // Click register button
      await page.click('button:has-text("Register")');
      
      // Fill registration form
      await page.fill('input[name="name"]', 'E2E Test User');
      await page.fill('input[name="email"]', 'e2e@test.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'Password123!');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should redirect to verification page
      await page.waitForSelector('text=Verify your email');
      
      // In a real test, you would retrieve the verification code
      // For now, we'll simulate successful verification
      await page.fill('input[name="verificationCode"]', '123456');
      await page.click('button:has-text("Verify")');
      
      // Should be logged in and see dashboard
      await page.waitForSelector('text=Welcome to LawHelp');
    });

    it('should handle login with 2FA', async () => {
      await page.goto('http://localhost:3000');
      
      // Login with 2FA enabled user
      await page.fill('input[name="email"]', '2fa@test.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      
      // Should prompt for 2FA code
      await page.waitForSelector('text=Two-Factor Authentication');
      
      // Enter 2FA code
      await page.fill('input[name="twoFactorCode"]', '123456');
      await page.click('button:has-text("Verify")');
      
      // Should be logged in
      await page.waitForSelector('text=Welcome to LawHelp');
    });
  });

  describe('Chat Functionality', () => {
    beforeEach(async () => {
      // Login before each test
      await page.goto('http://localhost:3000');
      await page.fill('input[name="email"]', 'e2e@test.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Welcome to LawHelp');
    });

    it('should create new chat and send message', async () => {
      // Navigate to chat
      await page.click('text=Chat');
      
      // Start new chat
      await page.click('button:has-text("New Chat")');
      
      // Send message
      const testMessage = 'What are the marriage laws in Cameroon?';
      await page.fill('textarea[placeholder*="Type your message"]', testMessage);
      await page.press('textarea[placeholder*="Type your message"]', 'Enter');
      
      // Should see user message
      await page.waitForSelector(`text=${testMessage}`);
      
      // Should see AI response
      await page.waitForSelector('.bot-message', { timeout: 10000 });
    });

    it('should save and load chat history', async () => {
      await page.click('text=Chat');
      
      // Check if previous chat exists in history
      const chatHistory = await page.locator('.chat-history-item');
      const count = await chatHistory.count();
      
      expect(count).toBeGreaterThan(0);
      
      // Click on a previous chat
      if (count > 0) {
        await chatHistory.first().click();
        
        // Should load previous messages
        await page.waitForSelector('.message');
      }
    });
  });

  describe('Lawyer Directory', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:3000');
      await page.fill('input[name="email"]', 'e2e@test.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Welcome to LawHelp');
    });

    it('should browse and filter lawyers', async () => {
      await page.click('text=Find Lawyers');
      
      // Should see lawyer listings
      await page.waitForSelector('.lawyer-card');
      
      // Test filtering
      await page.selectOption('select[name="specialization"]', 'Family Law');
      await page.click('button:has-text("Search")');
      
      // Should filter results
      await page.waitForSelector('.lawyer-card');
    });

    it('should view lawyer details and submit rating', async () => {
      await page.click('text=Find Lawyers');
      await page.waitForSelector('.lawyer-card');
      
      // Click on first lawyer
      await page.click('.lawyer-card .view-details');
      
      // Should see lawyer details
      await page.waitForSelector('text=Contact Information');
      
      // Submit rating
      await page.click('.star-rating .star:nth-child(5)'); // 5 stars
      await page.fill('textarea[name="review"]', 'Excellent lawyer!');
      await page.click('button:has-text("Submit Rating")');
      
      // Should see success message
      await page.waitForSelector('text=Rating submitted successfully');
    });
  });

  describe('Performance Tests', () => {
    it('should load homepage within 2 seconds', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });

    it('should handle concurrent users', async () => {
      // Simulate multiple users
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(simulateUser(i));
      }
      
      await Promise.all(promises);
    });
  });

  async function simulateUser(userId) {
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    try {
      await userPage.goto('http://localhost:3000');
      await userPage.fill('input[name="email"]', `user${userId}@test.com`);
      await userPage.fill('input[name="password"]', 'Password123!');
      await userPage.click('button[type="submit"]');
      
      // Simulate user activity
      await userPage.click('text=Chat');
      await userPage.fill('textarea[placeholder*="Type your message"]', `Test message from user ${userId}`);
      await userPage.press('textarea[placeholder*="Type your message"]', 'Enter');
      
      await userPage.waitForSelector('.bot-message', { timeout: 5000 });
    } finally {
      await userContext.close();
    }
  }
});
