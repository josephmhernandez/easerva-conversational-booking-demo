import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/ui/Header";
import { Clock, Shield, Star, Users } from "lucide-react";
import Image from "next/image";
import { LandingHeroInteractive } from "../components/ui/LandingHeroInteractive";
import { SignOutButton } from "../components/ui/SignOutButton";
import { createClient } from "./utils/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 overflow-x-hidden">
      <Header email={user?.email ?? null} rightSlot={<SignOutButton />} />

      {/* Hero Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight break-words">
            Stop getting ghosted by{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              unresponsive agents
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed px-2">
            {`No more endless research or agent roulette. Tell us what you need, and we'll instantly
            match you with verified, available agents who actually respond within hours—not days.`}
          </p>

          {/* Main Chat Input - client island */}
          <div className="max-w-2xl mx-auto mb-8 w-full px-2">
            <LandingHeroInteractive variant="header" />
            <p className="text-xs sm:text-sm text-gray-500 mt-3 px-2">
              {`💬 Try: "Need responsive agent to sell my home fast"`}
            </p>
          </div>

          {/* Quick Start Options */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 px-2">
            <LandingHeroInteractive
              variant="quickstart"
              preset="Need agent to sell my house quickly with great communication"
              label="🏠 Sell My Home"
            />
            <LandingHeroInteractive
              variant="quickstart"
              preset={"Looking for buyer's agent who responds same day"}
              label="🔍 Find My Home"
            />
            <LandingHeroInteractive
              variant="quickstart"
              preset="First time buyer needs patient agent with lender connections"
              label="🌟 First Time Buyer"
            />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="px-4 py-8 sm:px-6 lg:px-8 bg-white/50 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 px-2">
              <Users className="w-6 h-6 text-orange-400 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Full-Time Only</p>
                <p className="text-xs sm:text-sm text-gray-600">No Part-Time Agents</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 px-2">
              <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Research Quickly</p>
                <p className="text-xs sm:text-sm text-gray-600">Book a Call in Minutes</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 px-2">
              <Shield className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  Pre-Vetted & Available
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Taking New Clients Now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12 break-words">
            No more agent horror stories
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Image
                    src="/placeholder.svg?height=48&width=48"
                    alt="Sarah M."
                    width={48}
                    height={48}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Sarah M.</h4>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {`"After being ghosted by 2 agents, Easerva matched me with someone who actually
                  responds within the hour. My house sold in 3 weeks with constant updates
                  throughout."`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Image
                    src="/placeholder.svg?height=48&width=48"
                    alt="Mike R."
                    width={48}
                    height={48}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Mike R.</h4>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {` "No more wondering if my agent cares about my deal. The one Easerva found me treats
                  real estate as their full-time job, not a side hustle. Made all the difference."`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Image
                    src="/placeholder.svg?height=48&width=48"
                    alt="Jessica L."
                    width={48}
                    height={48}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Jessica L.</h4>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {`"I spent weeks researching agents and still picked wrong. Easerva's 5-minute
                  process found me an agent who knew the local market inside and out. Saved me
                  months of stress."`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-400 to-pink-500 w-full">
        <div className="max-w-4xl mx-auto text-center w-full">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 break-words">
            Stop wasting time with unresponsive agents
          </h2>
          <p className="text-lg sm:text-xl text-orange-100 mb-8 max-w-2xl mx-auto px-2">
            Turn 30 minutes of stressful research into a 5-minute conversation that connects you
            with an agent who actually responds and cares about your success.
          </p>

          <div className="max-w-2xl mx-auto w-full px-2">
            <LandingHeroInteractive variant="body" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-gray-50 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Easerva</span>
            </div>
            <div className="flex items-center space-x-4 sm:space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Support
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-xs sm:text-sm text-gray-500">
            <p>© 2024 Easerva. Your service booking made easy.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
