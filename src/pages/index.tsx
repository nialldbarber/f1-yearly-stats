import { useMemo } from 'react'
import Head from 'next/head'
import { atom, useAtom } from 'jotai'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import BarLoader from 'react-spinners/BarLoader'
import { F } from 'ts-toolbelt'
import { z } from 'zod'
import styles from '@/styles/Home.module.css'
import { COUNTRIES_MAP } from '@/countries'
import Link from 'next/link'

type Season = number

const baseUrl = 'https://ergast.com/api/f1/'
const n = (x: string) => parseInt(x)

function getYear() {
  const date = new Date()
  return date.getFullYear()
}
const currentYear = getYear()
const yearAtom = atom(currentYear)

function getNthPlace(nth: number, season: Driver[]) {
  const {
    wins,
    Driver: { givenName, familyName },
    points,
  } = season[nth]
  return { wins, points, givenName, familyName }
}

function calculateWinningPercentage(season: Driver[]) {
  let winningPercentage: number
  const { wins, givenName, familyName } = getNthPlace(
    0,
    season
  )
  let firstPlaceWins = n(wins)
  let totalRaces = season.reduce(
    (total, current) => total + n(current.wins),
    0
  )
  winningPercentage = (firstPlaceWins / totalRaces) * 100
  return {
    winningPercentage: winningPercentage.toFixed(2),
    driver: `${givenName} ${familyName}`,
  }
}

function calculateWinningMarginPercentage(
  season: Driver[]
) {
  const {
    points: firstPoints,
    givenName: firstGivenName,
    familyName: firstFamilyName,
  } = getNthPlace(0, season)
  const {
    points: secondPoints,
    givenName: secondGivenName,
    familyName: secondFamilyName,
  } = getNthPlace(1, season)
  let difference = n(firstPoints) - n(secondPoints)
  let totalPoints = n(firstPoints) + n(secondPoints)
  let percentage = (difference / totalPoints) * 100
  return {
    percentage: percentage.toFixed(2),
    first: `${firstGivenName} ${firstFamilyName}`,
    second: `${secondGivenName} ${secondFamilyName}`,
  }
}

function hasSeasonBegun(season: Driver[]) {
  return Boolean(
    season.reduce(
      (total, current) => total + n(current.points),
      0
    )
  )
}

function formatName(name: string) {
  return name.toLowerCase().replace(' ', '-')
}

const MAP_PAST: Record<string, string> = {
  is: 'was',
}
const formatTense = (year: number, word: string) => {
  const currentYear = getYear()
  if (year !== currentYear) {
    return MAP_PAST[word]
  }
  return word
}

function isDriverRookie() {
  // get all seasons (from beginning to now)
  // does this driver appear only once?
  // if so - they are a rookie
  // if not, they're a vet
}

function hideYearIfNotStarted() {}

const driverSchema = z.object({
  Constructors: z.array(
    z.object({
      constructorId: z.string(),
      name: z.string(),
      nationality: z.string(),
    })
  ),
  Driver: z.object({
    code: z.string(),
    dateOfBirth: z.date(),
    driverId: z.string(),
    familyName: z.string(),
    givenName: z.string(),
    nationality: z.string(),
    permanentNumber: z.string(),
  }),
  points: z.string(),
  position: z.string(),
  wins: z.string(),
})
export type Driver = z.infer<typeof driverSchema>

const params = { limit: '400' }
export async function fetchF1Data(endpoint: string) {
  try {
    const response = await axios.get(
      `${baseUrl}${endpoint}.json`,
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(
      `Error fetching data for ${endpoint}: ${error}`
    )
  }
}

async function getDriverStandings(
  season: Season
): Promise<Driver[]> {
  try {
    const drivers = await fetchF1Data(
      `${season}/driverStandings`
    )
    return drivers.MRData.StandingsTable.StandingsLists[0]
      .DriverStandings
  } catch (error) {
    console.error(`Error: ${error}`)
    throw new Error(`Error: ${error}`)
  }
}

const seasonSchema = z.object({
  season: z.string(),
  url: z.string(),
})
type Seasons = z.infer<typeof seasonSchema>
async function getSeasonList(): Promise<Seasons[]> {
  try {
    const seasons = await fetchF1Data('seasons')
    return seasons.MRData.SeasonTable.Seasons
  } catch (error) {
    console.error(`Error: ${error}`)
    throw new Error(`Error: ${error}`)
  }
}

async function getCountryFlagFromNationality(
  nationality: string
) {
  try {
    const response = await axios.get(
      `https://countryflagsapi.com/svg/${COUNTRIES_MAP[nationality]}`
    )
    return response.data
  } catch (error) {
    throw new Error(
      `Error fetching data for ${nationality}: ${error}`
    )
  }
}

const SeasonList = () => {
  const [year, setYear] = useAtom(yearAtom)
  const { data, isLoading, error } = useQuery({
    queryKey: ['seasons'],
    queryFn: getSeasonList,
  })

  if (isLoading) return <BarLoader color="#FFF" />
  if (error) return <p>Error! :((((</p>

  return (
    <div className="fixed left-10 bottom-10 w-32 z-10">
      <div className="relative w-full lg:max-w-sm">
        <select
          className="w-full p-2.5 text-gray-500 bg-white border rounded-md shadow-sm outline-none appearance-none focus:border-indigo-600"
          onChange={(e) => setYear(n(e.target.value))}
          placeholder={`${year}`}
          defaultValue={year}
        >
          {data?.map(({ season }) => (
            <option key={season}>{season}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export type DriverRowStats = {
  driverId: Pick<Driver['Driver'], 'driverId'>
  position: Pick<Driver, 'position'>
  name: Pick<Driver['Driver'], 'givenName'> &
    Pick<Driver['Driver'], 'familyName'>
  team: string
  wins: Pick<Driver, 'wins'>
  points: Pick<Driver, 'points'>
}
const columnHelper = createColumnHelper<DriverRowStats>()
const columns = [
  columnHelper.accessor('position', {
    cell: (info) => info.getValue(),
    header: () => 'Pos',
  }),
  columnHelper.accessor('name', {
    cell: (info) => info.getValue(),
    header: () => 'Name',
  }),
  columnHelper.accessor('team', {
    cell: (info) => info.getValue(),
    header: () => 'Team',
  }),
  columnHelper.accessor('wins', {
    cell: (info) => info.getValue(),
    header: () => 'Wins',
  }),
  columnHelper.accessor('points', {
    cell: (info) => info.getValue(),
    header: () => 'Points',
  }),
]

export function Loading() {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <BarLoader color="#FFF" />
    </div>
  )
}

export default function Home() {
  const [year] = useAtom(yearAtom)
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', year],
    queryFn: () => getDriverStandings(year),
  })

  if (isLoading) return <Loading />
  if (error)
    return (
      <p className="flex items-center justify-center h-screen w-screen text-9xl">
        Error! :((((
      </p>
    )

  return (
    <>
      <Head>
        <title>F1 Yearly Stats</title>
        <meta
          name="description"
          content="F1 Yearly Stats wooooo"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1 className="text-7xl">{year}</h1>
        <SeasonList />
        <div className="w-full max-w-4xl mt-8">
          {/* @ts-ignore */}
          <DriverRow defaultData={data} />
        </div>
        <div className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-700 w-full mt-14" />
        {/* @ts-ignore */}
        <SeasonStats data={data} />
      </main>
    </>
  )
}

export const formatDriverRow = (driverRow: Driver[]) =>
  driverRow.map(
    ({
      position,
      Driver: { driverId, givenName, familyName },
      Constructors,
      wins,
      points,
    }) => ({
      driverId,
      position,
      name: `${givenName} ${familyName}`,
      team: Constructors[0]?.name,
      wins,
      points,
    })
  )

function getClassName(
  index: number,
  hasSeasonBegun: boolean
) {
  if (!hasSeasonBegun) return ''
  let className: string = ''
  if (index === 0) className += 'text-gold'
  else if (index === 1) className += 'text-silver'
  else if (index === 2) className += 'text-bronze'
  return className
}

const DriverRow = ({
  defaultData,
}: {
  defaultData: Driver[]
}) => {
  const data = useMemo(
    () => formatDriverRow(defaultData),
    [defaultData]
  )
  const { hasBegun } = useHasSeasonBegun(defaultData)
  const table = useReactTable({
    // @ts-ignore
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table className="w-full relative">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="text-left sticky top-0"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row, index) => (
          <tr
            key={row.id}
            className={getClassName(index, hasBegun)}
          >
            {row.getVisibleCells().map((cell) => {
              console.log(cell.getContext())
              const isDriver =
                cell.getContext().column.id === 'name'
              return isDriver ? (
                <td key={cell.id}>
                  <Link
                    href={`/drivers/${formatName(
                      `${
                        cell.getContext().row.original
                          .driverId
                      }`
                    )}`}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </Link>
                </td>
              ) : (
                <td key={cell.id}>
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const Title = ({ text }: { text: string }) => (
  <p className="text-xl font-bold">{text}</p>
)

export function SeasonStats({ data }: { data: Driver[] }) {
  const [year] = useAtom(yearAtom)
  const { hasBegun } = useHasSeasonBegun(data)
  const { driver, winningPercentage } =
    calculateWinningPercentage(data)
  const { first, second, percentage } =
    calculateWinningMarginPercentage(data)

  return (
    hasBegun && (
      <div>
        <p className="text-5xl mb-7">Stats</p>
        <div>
          <ul>
            {winningPercentage && (
              <li className="my-3">
                <Title text="Winning Percentage" />
                <i>{driver}s</i> winning percentage{' '}
                {formatTense(year, 'is')}{' '}
                <span className="text-red-400">
                  {winningPercentage}%
                </span>
              </li>
            )}
            <li className="my-3">
              <Title text="Winning Margin" />
              <i>{first}s</i> winning margin over{' '}
              <i>{second}</i> {formatTense(year, 'is')}{' '}
              <span className="text-red-400">
                {percentage}%
              </span>
            </li>
          </ul>
        </div>
      </div>
    )
  )
}

const useHasSeasonBegun = (data: Driver[]) => {
  const hasBegun = useMemo(
    () => hasSeasonBegun(data),
    [data]
  )
  return { hasBegun }
}
