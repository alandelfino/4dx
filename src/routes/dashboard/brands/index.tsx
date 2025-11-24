import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, RefreshCcw, Trash, Tag } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NewBrandSheet } from './-components/new-brand'
import { privateInstance } from '@/lib/auth'
import { EditBrandSheet } from './-components/edit-brand'
import { DeleteBrand } from './-components/delete-brand'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'



export const Route = createFileRoute('/dashboard/brands/')({
  component: RouteComponent,
})

type Brand = {
  id: number
  created_at: number
  updated_at: number
  name: string
  company_id: number
}

type BrandsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Brand[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [selectedBrands, setSelectedBrands] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['brands', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:tc5G7www/brands`, { params: { page: currentPage, per_page: perPage } })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar marcas')
      }
      return await response.data as BrandsResponse
    }
  })

  const [brands, setBrands] = useState<Brand[]>([])

  const columns: ColumnDef<Brand>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={brands.length > 0 && selectedBrands.length === brands.length}
            onCheckedChange={toggleSelectAll}
          />
        </div>
      ),
      cell: (brand) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedBrands.includes(brand.id)}
            onCheckedChange={() => toggleSelectBrand(brand.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r p-2!'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (brand) => brand.name,
      className: 'border-r p-2!'
    },
    {
      id: 'products',
      header: 'Produtos',
      cell: (_brand) => 0,
      headerClassName: 'w-[70px] border-r',
      className: 'w-[120px] p-2!'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setBrands(items)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)

    // Não sobrescrever currentPage com data.curPage para evitar conflitos de navegação
    // O currentPage deve ser controlado apenas pelas funções de navegação
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      toast.error('Erro ao carregar marcas')
    }
  }, [isError])

  // Resetar seleção quando mudar de página ou itens por página
  useEffect(() => {
    setSelectedBrands([])
  }, [currentPage, perPage])

  // Limpar seleção ao atualizar/refetch da listagem
  useEffect(() => {
    if (isRefetching) {
      setSelectedBrands([])
    }
  }, [isRefetching])

  // Garantir que a página atual está dentro dos limites
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])


  // Gerenciar seleção de itens
  const toggleSelectAll = () => {
    if (selectedBrands.length === brands.length) {
      setSelectedBrands([])
    } else {
      setSelectedBrands(brands.map(brand => brand.id))
    }
  }

  const toggleSelectBrand = (brandId: number) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter(id => id !== brandId))
    } else {
      setSelectedBrands([...selectedBrands, brandId])
    }
  }

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Marcas" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Marcas', href: '/dashboard/brands', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          {/* Filters */}
          <div className='flex items-center gap-2 flex-1'>

            <Button variant={'outline'}>
              <Funnel /> Filtros
            </Button>

          </div>

          <div className='flex items-center gap-2'>
            <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedBrands([]); refetch() }}>
              {
                (isLoading || isRefetching)
                  ? <><RefreshCcw className='animate-spin' /> Atualizando...</>
                  : <><RefreshCcw /> Atualizar</>
              }
            </Button>

            {selectedBrands.length === 1 ? (
              <DeleteBrand brandId={selectedBrands[0]} />
            ) : (
              <Button variant={'ghost'} disabled>
                <Trash /> Exluir
              </Button>
            )}

            {selectedBrands.length === 1 ? (
              <EditBrandSheet brandId={selectedBrands[0]} />
            ) : (
              <Button variant={'ghost'} disabled>
                <Edit /> Editar
              </Button>
            )}
            <NewBrandSheet />
          </div>

        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={brands}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma marca encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Tag className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma marca ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma marca. Comece criando sua primeira marca.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewBrandSheet />
                  <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedBrands([]); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCcw className='animate-spin' /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            // Disparar refetch quando houver mudança
            refetch()
          }} />

      </div>
    </div>
  )
}
