import { Resend } from "resend";
const resend = new Resend("YOUR_API_KEY");

export const sendApprovalMail = async (email) => {
  await resend.emails.send({
    from: "admin@yourapp.com",
    to: email,
    subject: "Account Approved",
    html: "<h3>Your account is approved. You can login now.</h3>",
  });
};
