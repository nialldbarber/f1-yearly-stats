import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { z } from 'zod'
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

async function getResults(driverId: string) {
  try {
    const response = await fetchF1Data(
      `drivers/${driverId}/results`
    )
    return response.MRData.RaceTable.Races
  } catch (error) {
    console.error(`Error: ${error}`)
    throw new Error(`Error: ${error}`)
  }
}

const individualDriverSchema = z.object({
  Circuit: z.object({
    Location: z.object({
      country: z.string(),
      lat: z.string(),
      locality: z.string(),
      long: z.string(),
    }),
    circuitId: z.string(),
    circuitName: z.string(),
  }),
  Results: z.array(
    z.object({
      Constructor: z.object({
        constructorId: z.string(),
        name: z.string(),
        nationality: z.string(),
      }),
      Driver: z.object({
        code: z.string(),
        dateOfBirth: z.string(),
        driverId: z.string(),
        familyName: z.string(),
        givenName: z.string(),
        nationality: z.string(),
        permanentNumber: z.string(),
      }),
      grid: z.string(),
      laps: z.string(),
      number: z.string(),
      points: z.string(),
      position: z.string(),
      positionText: z.string(),
      status: z.string(),
    })
  ),
  date: z.string(),
  raceName: z.string(),
  round: z.string(),
  season: z.string(),
})

function driverWins() {
  // const router = useRouter()
  // const { driver } = router.query

  // const [driverQuery, resultsQuery] = useQueries({
  //   queries: [
  //     {
  //       queryKey: ['individual_driver', driver],
  //       queryFn: () => getDriver(String(driver)),
  //     },
  //     {
  //       queryKey: ['results', driver],
  //       queryFn: () => getResults(String(driver)),
  //     },
  //   ],
  // })
  // var wins = 0
  // for (let i = 0; i < resultsQuery.data.length; i++)
  // {
  //   if (resultsQuery.data[i].Results[0].position === "1")
  //   {
  //     wins += 1
  //   }
  // }
  return
  // return wins
}

export default function Driver() {
  const router = useRouter()
  const { driver } = router.query

  const [driverQuery, resultsQuery] = useQueries({
    queries: [
      {
        queryKey: ['individual_driver', driver],
        queryFn: () => getDriver(String(driver)),
      },
      {
        queryKey: ['results', driver],
        queryFn: () => getResults(String(driver)),
      },
    ],
  })

  if (driverQuery.isLoading || resultsQuery.isLoading)
    return <Loading />
  if (driverQuery.error || resultsQuery.error)
    return (
      <p className="flex items-center justify-center h-screen w-screen text-9xl">
        Error! :((((
      </p>
    )
    //------------------
    var wins = 0
    var poles = 0
    var points = 0
    var FastestLaps = 0

    for (let i = 0; i < resultsQuery.data.length; i++)
    {
      if (resultsQuery.data[i].Results[0].position === "1"){wins += 1}
      if (resultsQuery.data[i].Results[0].grid === "1"){poles += 1}
      // if (resultsQuery.data[i].Results[0].status !== "Withdrew")
      // {
      //   if (resultsQuery.data[i].Results[0].FastestLap.rank === "1"){FastestLaps += 1}
      // }

      points += parseInt(resultsQuery.data[i].Results[0].points)
      console.log(resultsQuery.data[0].Results[0].points)
    }

  return (
    <div>
      <h1 className="text-6xl text-center mt-8">
        {driverQuery.data.givenName}{' '}
        {driverQuery.data.familyName}
      </h1>
      <br></br>
      <table className="w-full border 0">
        <tr>
          <th>Wins</th>
          <th>{wins}</th>
        </tr>
        <tr>
          <th>Poles</th>
          <th>{poles}</th>
        </tr>
        <tr>
          <th>Fastest Laps</th>
          <th>{FastestLaps}</th>
        </tr>
        <tr>
          <th>Points</th>
          <th>{points}</th>
        </tr>
      </table>

    </div>
  )
}
