/**
 * Monthly Reminder Service
 * Checks for new month and sends maintenance payment reminders
 */

/**
 * Check if it's the start of a new month and send reminders
 * This should be called on app initialization or via a scheduled task
 */
export const checkAndSendMonthlyReminders = async (sendRemindersAPI) => {
    try {
        // Get current date
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Check if it's the 1st day of the month
        if (currentDay === 1) {
            // Check if we've already sent reminders this month
            const lastReminderKey = `lastReminderSent_${currentYear}_${currentMonth}`;
            const lastReminderSent = localStorage.getItem(lastReminderKey);

            if (!lastReminderSent) {
                // Send reminders
                console.log('Sending monthly maintenance reminders...');
                await sendRemindersAPI();
                
                // Mark reminders as sent for this month
                localStorage.setItem(lastReminderKey, new Date().toISOString());
                
                return { sent: true, message: 'Monthly reminders sent successfully' };
            } else {
                return { sent: false, message: 'Reminders already sent this month' };
            }
        }

        return { sent: false, message: 'Not the first day of the month' };
    } catch (error) {
        console.error('Error checking and sending monthly reminders:', error);
        return { sent: false, error: error.message };
    }
};

/**
 * Initialize reminder service
 * Call this when the app starts
 */
export const initializeReminderService = (sendRemindersAPI) => {
    // Check immediately on load
    checkAndSendMonthlyReminders(sendRemindersAPI);

    // Also set up a daily check (in case the app is open for multiple days)
    const checkInterval = setInterval(() => {
        checkAndSendMonthlyReminders(sendRemindersAPI);
    }, 24 * 60 * 60 * 1000); // Check every 24 hours

    return () => clearInterval(checkInterval);
};

