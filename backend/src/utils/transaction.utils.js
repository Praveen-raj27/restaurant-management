
export const withTransactionRetry = async (
  operation,
  maxRetries = 3,
) => {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = error.code === "P2034";

      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }

      attempt += 1;

      // Small progressive delay before retrying.
      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 100),
      );
    }
  }
};
