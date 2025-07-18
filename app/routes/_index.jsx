import { redirect } from "@remix-run/node";

export const loader = async () => {
  // Redirect to the app dashboard
  return redirect("/app");
};