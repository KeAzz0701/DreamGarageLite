export class CreateCustomerDto {
  customerName: string;
  customerAddress?: string;

  ownerName?: string;
  ownerAddress?: string;

  phone?: string;
}