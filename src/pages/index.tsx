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
import { useReducer, useState } from 'react'

type DriverLine = {
  name: string
}

type Season = number

const date = new Date()
const currentYear = date.getFullYear()
const yearAtom = atom(currentYear)

const baseUrl = 'https://ergast.com/api/f1/'

const driverSchema = z.object({
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
type Driver = z.infer<typeof driverSchema>

const params = { limit: '100' }
async function fetchF1Data(endpoint: string) {
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
    <div className="absolute left-10 w-32">
      <div className="relative w-full lg:max-w-sm">
        <select
          className="w-full p-2.5 text-gray-500 bg-white border rounded-md shadow-sm outline-none appearance-none focus:border-indigo-600"
          onChange={(e) =>
            setYear(parseInt(e.target.value))
          }
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

type DriverRowStats = {
  position: Pick<Driver, 'position'>
  name: Pick<Driver['Driver'], 'givenName'> &
    Pick<Driver['Driver'], 'familyName'>
  wins: Pick<Driver, 'wins'>
  points: Pick<Driver, 'points'>
}
const columnHelper = createColumnHelper<DriverRowStats>()
const columns = [
  columnHelper.accessor('position', {
    cell: (info) => info.getValue(),
    header: () => 'Position',
  }),
  columnHelper.accessor('name', {
    cell: (info) => info.getValue(),
    header: () => 'Name',
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

export default function Home() {
  const [year] = useAtom(yearAtom)
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', year],
    queryFn: () => getDriverStandings(year),
  })

  if (isLoading)
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <BarLoader color="#FFF" />
      </div>
    )
  if (error) return <p>Error! :((((</p>

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
        <div>
          <DriverRow defaultData={data} />
        </div>
      </main>
    </>
  )
}

type DriverRow = {
  Constructors: Array<{
    constructorId: string
    name: string
    nationality: string
  }>
  Driver: Driver['Driver']
  points: Driver['points']
  position: Driver['position']
  wins: Driver['wins']
}

const formatDriverRow = (driverRow: DriverRow[]) =>
  driverRow.map(
    ({
      position,
      Driver: { givenName, familyName },
      wins,
      points,
    }) => ({
      position,
      name: `${givenName} ${familyName}`,
      wins,
      points,
    })
  )

const getClassName = (index: number) => {
  let className: string = ''
  if (index === 0) className += 'text-red-400'
  else if (index === 1) className += 'text-orange-400'
  else if (index === 2) className += 'text-yellow-400'
  return className
}

const DriverRow = ({ defaultData }: any) => {
  const data = formatDriverRow(defaultData)
  const table = useReactTable({
    // @ts-ignore
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
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
          <tr key={row.id} className={getClassName(index)}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
