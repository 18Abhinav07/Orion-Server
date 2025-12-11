// src/services/notificationService.ts

/**
 * Sends a notification when a potential derivative is detected.
 * @param uploaderEmail The email of the user who uploaded the content.
 * @param parentCreator A reference to the original creator.
 * @param score The similarity score.
 */
export async function notifyDerivativeDetected(uploaderEmail: string, parentCreator: any, score: number): Promise<void> {
  // TODO: Implement email sending logic (e.g., using nodemailer)
  // TODO: Check if email notifications are enabled in config
  console.log(uploaderEmail, parentCreator, score);
  console.warn('Notification service not fully implemented.');
}

/**
 * Sends a notification to admins when a new dispute requires review.
 * @param adminEmail The email of an admin.
 * @param disputeId The ID of the dispute.
 */
export async function notifyDisputeCreated(adminEmail: string, disputeId: string): Promise<void> {
  // TODO: Implement email sending logic
  console.log(adminEmail, disputeId);
  console.warn('Notification service not fully implemented.');
}

/**
 * Sends a notification to a user about the resolution of a dispute.
 * @param userEmail The email of the user to notify.
 * @param status The final status of the dispute.
 * @param ipId The IP ID involved in the dispute.
 */
export async function notifyResolution(userEmail: string, status: string, ipId: string): Promise<void> {
  // TODO: Implement email sending logic
  console.log(userEmail, status, ipId);
  console.warn('Notification service not fully implemented.');
}
