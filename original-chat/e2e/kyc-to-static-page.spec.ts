import { expect, test, type Page } from "@playwright/test";

type ReviewApplication = {
  business_id: string;
  status: string;
  businessInfo?: {
    slug?: string;
    citySlug?: string;
    categorySlug?: string;
    stateSlug?: string;
    state?: string;
  };
};

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(ADMIN_EMAIL ?? "");
  await page.getByLabel("Password").fill(ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin\//, { timeout: 45_000 });
}

function staticUrlCandidates(baseUrl: string, app: ReviewApplication): string[] {
  const slug = app.businessInfo?.slug;
  const citySlug = app.businessInfo?.citySlug;
  const categorySlug = app.businessInfo?.categorySlug;
  const stateSlug = app.businessInfo?.stateSlug ?? app.businessInfo?.state;

  if (!slug || !citySlug || !categorySlug) return [];

  const urls = new Set<string>();
  urls.add(`${baseUrl}/providers/${citySlug}/${categorySlug}/${slug}/`);

  if (stateSlug) {
    urls.add(`${baseUrl}/providers/${stateSlug}/${citySlug}/${categorySlug}/${slug}/`);
  }

  return Array.from(urls);
}

async function waitForStaticPage(page: Page, urls: string[], timeoutMs = 120_000) {
  const startedAt = Date.now();
  const seenStatuses = new Map<string, number>();

  while (Date.now() - startedAt < timeoutMs) {
    for (const url of urls) {
      const response = await page.request.get(url, { failOnStatusCode: false });
      seenStatuses.set(url, response.status());

      if (response.status() !== 200) continue;

      const html = await response.text();
      if (html.includes("application/ld+json")) {
        return { url, html };
      }
    }

    await page.waitForTimeout(10_000);
  }

  const summary = Array.from(seenStatuses.entries())
    .map(([url, status]) => `${url} -> ${status}`)
    .join(", ");

  throw new Error(
    `Static page did not become ready within ${timeoutMs / 1000}s. Last statuses: ${summary}`
  );
}

test("KYC approval triggers static page build", async ({ page, baseURL }) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test."
  );
  test.skip(
    !process.env.QA_BASIC_AUTH_USER || !process.env.QA_BASIC_AUTH_PASS,
    "Set QA_BASIC_AUTH_USER and QA_BASIC_AUTH_PASS to run against QA."
  );

  const confirmedBusinessId = process.env.E2E_KYC_BUSINESS_ID;

  // 1) Login
  await loginAsAdmin(page);

  // 2) Open KYC queue
  await page.goto("/admin/kyc");
  await expect(page.getByRole("heading", { name: "KYC Review Queue" })).toBeVisible();

  // 3) Identify test business from review API (prefer explicit env business ID)
  const reviewResponse = await page.request.get("/api/business/onboarding/review");
  expect(reviewResponse.ok()).toBeTruthy();

  const reviewJson = await reviewResponse.json();
  const apps: ReviewApplication[] = reviewJson.applications ?? [];

  const pendingApps = apps.filter((app) => app.status === "submitted");
  const targetApp = confirmedBusinessId
    ? apps.find((app) => app.business_id === confirmedBusinessId)
    : pendingApps[0];

  test.skip(!targetApp, "No KYC application available for E2E run.");

  const businessId = targetApp!.business_id;

  // 4) Open details, approve, then trigger static build
  await page.goto(`/admin/kyc/${businessId}`);
  await expect(page.getByRole("heading", { name: "KYC Decision" })).toBeVisible();

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Business approved! Static build can now be triggered.")).toBeVisible(
    {
      timeout: 30_000,
    }
  );

  await page.getByRole("button", { name: "Trigger Static Build" }).click();
  await expect(page.getByText("Build triggered — page will be live within 2 minutes.")).toBeVisible(
    {
      timeout: 30_000,
    }
  );

  // 5) Resolve likely static page URL and wait until live
  const refreshedReviewResponse = await page.request.get("/api/business/onboarding/review");
  expect(refreshedReviewResponse.ok()).toBeTruthy();

  const refreshedJson = await refreshedReviewResponse.json();
  const refreshedApps: ReviewApplication[] = refreshedJson.applications ?? [];
  const refreshedApp = refreshedApps.find((app) => app.business_id === businessId) ?? targetApp!;

  const urls = staticUrlCandidates(baseURL ?? "https://qa.easerva.com", refreshedApp);
  test.skip(urls.length === 0, "Missing slug/city/category fields needed to construct static URL.");

  const result = await waitForStaticPage(page, urls);

  // 6) Final assertion
  expect(result.html).toContain("application/ld+json");
});
