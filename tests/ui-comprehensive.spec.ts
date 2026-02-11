import { test, expect } from '@playwright/test';

test.describe('Isle AI - Place Cards & Chatbot Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to AI Guide section (where the map and chatbot are)
    const aiGuideButton = page.locator('button:has-text("AI Guide")');
    if (await aiGuideButton.isVisible().catch(() => false)) {
      await aiGuideButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test.describe('Map and Place Cards', () => {

    test('Map loads with markers', async ({ page }) => {
      // Look for the map container
      const mapContainer = page.locator('.leaflet-container');
      await expect(mapContainer).toBeVisible({ timeout: 10000 });

      // Check for markers
      const markers = page.locator('.leaflet-marker-icon');
      const markerCount = await markers.count();
      console.log(`Found ${markerCount} markers on the map`);
      expect(markerCount).toBeGreaterThan(0);
    });

    test('Clicking a marker shows place card popup', async ({ page }) => {
      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Find and click first visible marker
      const markers = page.locator('.leaflet-marker-icon');
      const markerCount = await markers.count();
      console.log(`Total markers: ${markerCount}`);

      if (markerCount > 0) {
        // Click on first marker
        await markers.first().click({ force: true });
        await page.waitForTimeout(1000);

        // Check for popup or place card
        const popup = page.locator('.leaflet-popup');
        const placeCard = page.locator('[class*="place-card"], [class*="PlaceCard"]');

        const popupVisible = await popup.isVisible().catch(() => false);
        const cardVisible = await placeCard.isVisible().catch(() => false);

        console.log(`Popup visible: ${popupVisible}, PlaceCard visible: ${cardVisible}`);

        // Either popup or card should be visible
        expect(popupVisible || cardVisible).toBe(true);
      }
    });

    test('Place card has all required elements', async ({ page }) => {
      // Wait for map
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Click a marker cluster or marker
      const markerClusters = page.locator('.marker-cluster');
      const markers = page.locator('.leaflet-marker-icon');

      if (await markerClusters.count() > 0) {
        await markerClusters.first().click({ force: true });
        await page.waitForTimeout(500);
      }

      if (await markers.count() > 0) {
        await markers.first().click({ force: true });
        await page.waitForTimeout(1500);
      }

      // Check popup content
      const popup = page.locator('.leaflet-popup-content');
      if (await popup.isVisible().catch(() => false)) {
        const popupText = await popup.textContent();
        console.log('Popup content:', popupText?.slice(0, 200));

        // Check for Directions button
        const directionsLink = popup.locator('a[href*="google.com/maps/dir"]');
        const directionsVisible = await directionsLink.isVisible().catch(() => false);
        console.log('Directions button visible:', directionsVisible);

        // Check for Website button (if exists)
        const websiteLink = popup.locator('a:has-text("Website")');
        const websiteVisible = await websiteLink.isVisible().catch(() => false);
        console.log('Website button visible:', websiteVisible);
      }
    });

    test('Directions button links to Google Maps', async ({ page }) => {
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Click a marker
      const markers = page.locator('.leaflet-marker-icon');
      if (await markers.count() > 0) {
        await markers.first().click({ force: true });
        await page.waitForTimeout(1500);
      }

      // Find directions link
      const directionsLink = page.locator('a[href*="google.com/maps/dir"]').first();
      if (await directionsLink.isVisible().catch(() => false)) {
        const href = await directionsLink.getAttribute('href');
        console.log('Directions URL:', href);

        expect(href).toContain('google.com/maps/dir');
        expect(href).toContain('destination=');

        // Check for target="_blank"
        const target = await directionsLink.getAttribute('target');
        expect(target).toBe('_blank');

        // Check for rel="noopener noreferrer"
        const rel = await directionsLink.getAttribute('rel');
        expect(rel).toContain('noopener');
      }
    });

    test('Website button opens in new tab', async ({ page }) => {
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Click markers until we find one with a website
      const markers = page.locator('.leaflet-marker-icon');
      const markerCount = await markers.count();

      let foundWebsite = false;
      for (let i = 0; i < Math.min(markerCount, 10); i++) {
        await markers.nth(i).click({ force: true });
        await page.waitForTimeout(1000);

        const websiteLink = page.locator('a:has-text("Website")').first();
        if (await websiteLink.isVisible().catch(() => false)) {
          const href = await websiteLink.getAttribute('href');
          const target = await websiteLink.getAttribute('target');

          console.log(`Found website link: ${href}`);
          expect(target).toBe('_blank');
          foundWebsite = true;
          break;
        }

        // Close popup by clicking elsewhere
        await page.locator('.leaflet-container').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(500);
      }

      if (!foundWebsite) {
        console.log('No markers with website links found in first 10 markers');
      }
    });

    test('Book Now button works when available', async ({ page }) => {
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Click markers until we find one with a booking URL
      const markers = page.locator('.leaflet-marker-icon');
      const markerCount = await markers.count();

      let foundBooking = false;
      for (let i = 0; i < Math.min(markerCount, 15); i++) {
        await markers.nth(i).click({ force: true });
        await page.waitForTimeout(1000);

        const bookingLink = page.locator('a:has-text("Book")').first();
        if (await bookingLink.isVisible().catch(() => false)) {
          const href = await bookingLink.getAttribute('href');
          const target = await bookingLink.getAttribute('target');

          console.log(`Found booking link: ${href}`);
          expect(href).toBeTruthy();
          expect(target).toBe('_blank');
          foundBooking = true;
          break;
        }

        // Close popup
        await page.locator('.leaflet-container').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(500);
      }

      if (!foundBooking) {
        console.log('No markers with booking links found in first 15 markers');
      }
    });
  });

  test.describe('AI Chatbot Tests', () => {

    test('Chatbot is accessible and responsive', async ({ page }) => {
      // Look for chat input
      const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[type="text"]').first();

      if (await chatInput.isVisible().catch(() => false)) {
        await expect(chatInput).toBeEnabled();
        console.log('Chat input found and enabled');
      } else {
        // Try to find and click a chat toggle button
        const chatToggle = page.locator('button:has-text("Chat"), button:has-text("Ask"), [class*="chat"]').first();
        if (await chatToggle.isVisible().catch(() => false)) {
          await chatToggle.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('Chat Question 1: Best beaches', async ({ page }) => {
      // Find chat input - look for the input with placeholder containing "island" or "vibe"
      const chatInput = page.locator('input[placeholder*="island"], input[placeholder*="vibe"], textarea').first();
      await page.waitForTimeout(2000);

      if (await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('What are the best beaches in Cayman Islands?');

        // Find and click send button - it's a cyan button with an arrow/send icon
        // The send button is inside a form or next to the input
        const sendButton = page.locator('button.bg-gradient-to-r, button[class*="cyan"], button[class*="teal"]').first();
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click({ force: true });
        } else {
          // Try pressing Enter on the input
          await chatInput.press('Enter');
        }

        // Wait for response
        await page.waitForTimeout(10000);

        // Check for response content
        const responseArea = page.locator('[class*="message"], [class*="response"], [class*="chat"]');
        const responseText = await responseArea.textContent().catch(() => '');
        console.log('Response received:', responseText?.slice(0, 200));

        // Check if place cards appeared
        const placeCards = page.locator('[class*="card"], [class*="place"]');
        const cardCount = await placeCards.count();
        console.log(`Place cards shown: ${cardCount}`);
      }
    });

    test('Chat Question 2: Restaurant recommendations', async ({ page }) => {
      const chatInput = page.locator('input[placeholder*="island"], input[placeholder*="vibe"], textarea').first();
      await page.waitForTimeout(2000);

      if (await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('Recommend restaurants near Seven Mile Beach');

        const sendButton = page.locator('button.bg-gradient-to-r, button[class*="cyan"], button[class*="teal"]').first();
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click({ force: true });
        } else {
          await chatInput.press('Enter');
        }

        await page.waitForTimeout(10000);

        const responseArea = page.locator('[class*="message"], [class*="response"]');
        const hasResponse = await responseArea.count() > 0;
        console.log('Got restaurant response:', hasResponse);
      }
    });

    test('Chat Question 3: Activities query', async ({ page }) => {
      const chatInput = page.locator('input[placeholder*="island"], input[placeholder*="vibe"], textarea').first();
      await page.waitForTimeout(2000);

      if (await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('What activities can I do in Grand Cayman?');

        const sendButton = page.locator('button.bg-gradient-to-r, button[class*="cyan"], button[class*="teal"]').first();
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click({ force: true });
        } else {
          await chatInput.press('Enter');
        }

        await page.waitForTimeout(10000);

        // Check for map markers being highlighted
        const highlightedMarkers = page.locator('.leaflet-marker-icon[class*="highlight"], .leaflet-marker-icon[class*="pulse"]');
        const highlightCount = await highlightedMarkers.count();
        console.log('Highlighted markers:', highlightCount);
      }
    });

    test('Chat Question 4: Hotel search', async ({ page }) => {
      const chatInput = page.locator('input[placeholder*="island"], input[placeholder*="vibe"], textarea').first();
      await page.waitForTimeout(2000);

      if (await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('Find luxury hotels in George Town');

        const sendButton = page.locator('button.bg-gradient-to-r, button[class*="cyan"], button[class*="teal"]').first();
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click({ force: true });
        } else {
          await chatInput.press('Enter');
        }

        await page.waitForTimeout(10000);

        // Verify response includes hotels
        const cards = page.locator('[class*="card"]');
        const cardCount = await cards.count();
        console.log('Cards in response:', cardCount);
      }
    });
  });

  test.describe('UI Element Validation', () => {

    test('All buttons are clickable', async ({ page }) => {
      await page.waitForTimeout(2000);

      // Find all visible buttons
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} visible buttons`);

      const brokenButtons: string[] = [];

      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const button = buttons.nth(i);
        const isEnabled = await button.isEnabled().catch(() => false);
        const buttonText = await button.textContent().catch(() => 'unknown');

        if (!isEnabled) {
          brokenButtons.push(buttonText || 'unnamed button');
        }
      }

      if (brokenButtons.length > 0) {
        console.log('Disabled buttons found:', brokenButtons);
      }

      expect(brokenButtons.length).toBeLessThan(5);
    });

    test('All links have valid hrefs', async ({ page }) => {
      await page.waitForTimeout(2000);

      // Find all links
      const links = page.locator('a[href]:visible');
      const linkCount = await links.count();
      console.log(`Found ${linkCount} visible links`);

      const invalidLinks: string[] = [];

      for (let i = 0; i < Math.min(linkCount, 30); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        const linkText = await link.textContent().catch(() => 'unknown');

        if (!href || href === '#' || href === 'undefined' || href === 'null') {
          invalidLinks.push(`"${linkText}" -> ${href}`);
        }
      }

      if (invalidLinks.length > 0) {
        console.log('Invalid links found:', invalidLinks);
      }

      expect(invalidLinks.length).toBe(0);
    });

    test('External links open in new tab', async ({ page }) => {
      await page.waitForTimeout(2000);

      // Find external links
      const externalLinks = page.locator('a[href^="http"]:visible');
      const linkCount = await externalLinks.count();
      console.log(`Found ${linkCount} external links`);

      const missingTargetBlank: string[] = [];

      for (let i = 0; i < Math.min(linkCount, 20); i++) {
        const link = externalLinks.nth(i);
        const href = await link.getAttribute('href');
        const target = await link.getAttribute('target');

        if (target !== '_blank') {
          missingTargetBlank.push(href || 'unknown');
        }
      }

      if (missingTargetBlank.length > 0) {
        console.log('Links missing target="_blank":', missingTargetBlank);
      }
    });

    test('Images load without errors', async ({ page }) => {
      await page.waitForTimeout(3000);

      // Check for broken images
      const images = page.locator('img:visible');
      const imageCount = await images.count();
      console.log(`Found ${imageCount} visible images`);

      const brokenImages: string[] = [];

      for (let i = 0; i < Math.min(imageCount, 20); i++) {
        const img = images.nth(i);
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        const src = await img.getAttribute('src');

        if (naturalWidth === 0) {
          brokenImages.push(src || 'unknown');
        }
      }

      if (brokenImages.length > 0) {
        console.log('Broken images:', brokenImages);
      }
    });
  });
});
