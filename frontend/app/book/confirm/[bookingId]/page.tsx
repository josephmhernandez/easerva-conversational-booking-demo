"use client";

import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  // TODO: Replace with real booking query
  // Query: supabase.from('bookings').select(`
  //   *,
  //   service:services(*),
  //   business:businesses(*),
  //   location:locations(*)
  // `).eq('id', bookingId).single()
  // If booking not found, show 404 or error state

  // Mock booking data - in production this would come from the database
  const mockBooking = {
    id: bookingId,
    status: "confirmed",
    service: {
      name: "Men's Haircut",
      duration: 45,
      price: 35.0,
      description: "Professional haircut with wash and style",
    },
    business: {
      name: "Jane's Salon",
      phone: "(555) 123-4567",
      email: "contact@janessalon.com",
    },
    location: {
      address: "123 Main St, Austin, TX 78701",
    },
    provider: {
      name: "Sarah Johnson",
    },
    appointment: {
      date: new Date(Date.now() + 86400000 * 2), // 2 days from now
      time: "10:30",
    },
    customer: {
      name: "John Doe",
      email: "john@example.com",
      phone: "(555) 987-6543",
      notes: "",
    },
    createdAt: new Date(),
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600">Your appointment has been successfully scheduled</p>
          <p className="text-sm text-gray-500 mt-2">
            Booking ID: <span className="font-mono font-semibold">{bookingId}</span>
          </p>
        </div>

        {/* Appointment Details Card */}
        <Card className="mb-6 border-1  shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-t-xl p-4">
            <CardTitle className="text-xl">Appointment Details</CardTitle>
            <CardDescription className="text-white/90">
              Please save this information for your records
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Service Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Service</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900 text-lg">{mockBooking.service.name}</p>
                <p className="text-sm text-gray-600 mt-1">{mockBooking.service.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {mockBooking.service.duration} minutes
                  </span>
                  <span className="font-semibold text-gray-900">
                    ${mockBooking.service.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Date & Time */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">When</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  <span className="text-gray-900 font-medium">
                    {formatDate(mockBooking.appointment.date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-gray-900 font-medium">
                    {formatTime(mockBooking.appointment.time)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Where</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{mockBooking.business.name}</p>
                <div className="flex items-start gap-2 mt-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{mockBooking.location.address}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Provider */}
            {mockBooking.provider && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Provider</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-900 font-medium">{mockBooking.provider.name}</span>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Your Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{mockBooking.customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{mockBooking.customer.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{mockBooking.customer.phone}</span>
                </div>
                {mockBooking.customer.notes && (
                  <div className="flex items-start gap-3 mt-3 pt-3 border-t border-gray-200">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-900">{mockBooking.customer.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card className="mb-6 border-1 py-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Need to Make Changes?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              If you need to reschedule or cancel your appointment, please contact us:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a
                  href={`tel:${mockBooking.business.phone}`}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {mockBooking.business.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a
                  href={`mailto:${mockBooking.business.email}`}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {mockBooking.business.email}
                </a>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Cancellation Policy: Free cancellation up to 24 hours before your appointment.
            </p>
          </CardContent>
        </Card>

        {/* Confirmation Email Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Confirmation Email Sent</p>
              <p className="text-sm text-blue-700 mt-1">
                A confirmation email has been sent to{" "}
                <span className="font-medium">{mockBooking.customer.email}</span> with all the
                details of your appointment.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => router.push("/")}
            className="flex-1 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
          >
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="flex-1">
            Print Confirmation
          </Button>
        </div>
      </div>
    </div>
  );
}
