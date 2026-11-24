import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { cep: string } }
) {
  try {
    const rawCep = params.cep.replace(/\D/g, '');

    if (rawCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP inválido. Deve conter 8 dígitos.' },
        { status: 400 }
      );
    }

    // Consulta ViaCEP
    const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error('Falha ao consultar ViaCEP');
    }

    const data = await res.json();

    if (data.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado na base dos Correios.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cep: data.cep,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || 'São Paulo',
      state: data.uf || 'SP',
      formattedAddress: `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro || ''} - ${data.localidade || 'São Paulo'} - ${data.uf || 'SP'}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao consultar CEP' },
      { status: 500 }
    );
  }
}

