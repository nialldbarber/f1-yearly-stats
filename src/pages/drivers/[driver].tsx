import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { fetchF1Data, Loading } from '../index'

async function getDriver(driverId: string): Promise<any> {
  try {
    const response = await fetchF1Data(
      `drivers/${driverId}`
    )
    return response?.MRData?.DriverTable?.Drivers[0]
  } catch (error) {
    console.error(`Error: ${error}`)
    throw new Error(`Error: ${error}`)
  }
}

export default function Driver() {
  const router = useRouter()
  const { driver } = router.query

  const { data, isLoading, error } = useQuery({
    queryKey: ['individual_driver', driver],
    queryFn: () => getDriver(String(driver)),
  })

  if (isLoading) return <Loading />
  if (error)
    return (
      <p className="flex items-center justify-center h-screen w-screen text-9xl">
        Error! :((((
      </p>
    )

  console.log(data)

  return (
    <div>
      <h1 className="text-6xl text-center mt-8">
        {data.givenName} {data.familyName}
      </h1>
    </div>
  )
}
