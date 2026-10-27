import Link from "next/link";
import { Building } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="flex flex-col col-span-2 gap-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-emerald-600" />
              <span className="text-xl font-bold">RealtyAI</span>
            </div>
            <p className="text-sm text-gray-500">
              AI-powered real estate assistant helping you find and book your dream property with
              ease.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Product</h3>
            <nav className="flex flex-col gap-2">
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Features
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Pricing
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Testimonials
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                FAQ
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Company</h3>
            <nav className="flex flex-col gap-2">
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                About
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Blog
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Careers
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Contact
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Legal</h3>
            <nav className="flex flex-col gap-2">
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:underline">
                Cookie Policy
              </Link>
            </nav>
          </div>
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-gray-500">© 2025 RealtyAI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Twitter</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Facebook</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">Instagram</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-900">
              <span className="sr-only">LinkedIn</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
