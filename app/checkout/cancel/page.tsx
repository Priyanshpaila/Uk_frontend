export default function Cancel() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold text-red-600">
        Payment cancelled
      </h1>
      <p className="mt-2 text-gray-700">
        Your payment was not completed. If this was a mistake, please try again.
      </p>
    </main>
  )
}
