// "use client";

// // TODO: Remove this page.
// import CronofyCalendarSync from "@/app/components/CronofyCalendarSync/CronofyCalendarSync";
// import { useAuth } from "@/app/hooks/useAuth";
// import { redirect } from "next/navigation";
// import { useEffect, useState } from "react";
// import BookWithCompanyWidget from "../../components/BookWithCompanyWidget/BookWithCompanyWidget";
// import ConnectedCalendars from "../../components/ConnectedCalendars/ConnectedCalendars";

// const BusinessOnboardPage = () => {
//   const { user, loading } = useAuth();

//   const [, setDefaultCalendar] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchDefaultCalendar = async () => {
//       try {
//         const res = await fetch(`/api/cronofy/default-calendar`, {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//           },
//         });
//         const data = await res.json();
//         setDefaultCalendar(data.calendar_id);
//       } catch (error) {
//         console.error("Error fetching default calendar:", error);
//       }
//     };

//     if (user) {
//       fetchDefaultCalendar();
//     }
//   }, [user]);

//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   if (!user) {
//     // redirect to login page
//     redirect("/login");
//     return <div>You must be logged in to access this page.</div>;
//   }

//   return (
//     <div>
//       <h1> Business onboarding page. Connect your calendar. </h1>

//       {/* <button
//         onClick={() => (window.location.href = "/api/cronofy/start")}
//         className="rounded-xl px-4 py-2 border shadow-sm hover:shadow-md"
//       >
//         Connect calendar
//       </button> */}

//       {/* Embedded Cronofy manager */}
//       <CronofyCalendarSync />

//       <div className="px-4 sm:px-6 lg:px-8 py-6">
//         <h1 className="text-2xl font-semibold mb-4">Default Calendar</h1>
//         <p>This is the default calendar that will be used to book events.</p>
//       </div>

//       <div className="px-4 sm:px-6 lg:px-8 py-6">
//         <h1 className="text-2xl font-semibold mb-4">Book with Company A</h1>
//         <BookWithCompanyWidget hostUserId={"2745cdeb-3cd4-46d6-98b0-734b1a01aff3"} />
//       </div>

//       {/* Your Shadcn/Tailwind list with green checks */}
//       <div className="mt-6">
//         <ConnectedCalendars />
//       </div>
//     </div>
//   );
// };

// export default BusinessOnboardPage;
