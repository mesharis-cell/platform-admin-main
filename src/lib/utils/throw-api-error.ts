export const throwApiError = (error: Error | unknown) => {
	let errorMessage = "Unknown error";

  if (error instanceof Error) {
    // Check if it's an Axios error with a response
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage = axiosError.response?.data?.message || error.message;
  }
  throw new Error(errorMessage);
};