// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const response = await fetch(
      'http://ergast.com/api/f1/'
    )
    if (!response.ok) {
      throw new Error('invalid')
    }
    const json = await response.json()
    res.status(200).json(json)
  } catch (error) {
    res.status(500).json({ message: 'shiiiiiit' })
  }
}
