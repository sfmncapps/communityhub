export const sendApprovalEmail = async (email, username) => {
  await fetch("/api/send-approval-email", {
    method: "POST",
    body: JSON.stringify({ email, username }),
  });
};
