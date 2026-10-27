import Link from "next/link";

const BusinessPage = async () => {
  // For server-side conditional redirects, you can use redirect() directly
  // Example: if (someCondition) redirect('/business/start');

  return (
    <div>
      <h1> Business onboarding page. join here. up here. </h1>

      <p> convincing copy to get you to sign up. </p>

      {/* <Link href="/business/start">
        <button className="rounded-xl px-4 py-2 border shadow-sm hover:shadow-md">Sign up</button>
      </Link> */}
    </div>
  );
};

export default BusinessPage;
